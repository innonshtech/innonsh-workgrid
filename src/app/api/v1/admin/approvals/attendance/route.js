import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceRegularization from "@/lib/db/models/payroll/AttendanceRegularization";
import Attendance from "@/lib/db/models/payroll/Attendance";
import PayrollRun from "@/lib/db/models/payroll/PayrollRun";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import { getAuthUser } from "@/lib/auth-util";
import { sendRegularizationStatusUpdateEmail } from "@/utils/notifications";
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    // Resolve employee ID to support User/Employee record separation
    let currentEmployeeId = authUser.id;
    if (mongoose.Types.ObjectId.isValid(authUser.id)) {
        const emp = await Employee.findById(authUser.id).select('_id');
        if (!emp) {
            const userRec = await User.findById(authUser.id).select('employeeId email');
            if (userRec) {
                let mappedEmp = null;
                if (userRec.employeeId) {
                    mappedEmp = await Employee.findOne({ employeeId: userRec.employeeId }).select('_id');
                }
                if (!mappedEmp && userRec.email) {
                    mappedEmp = await Employee.findOne({ 'personalDetails.email': userRec.email }).select('_id');
                }
                if (mappedEmp) currentEmployeeId = mappedEmp._id.toString();
            }
        }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "Pending";

    let query = { status };
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      query.approver = currentEmployeeId;
    }

    // Managers/Admins see requests where they are the assigned approver
    // Admins and super_admins see all.
    const requests = await AttendanceRegularization.find(query)
    .populate('employee', 'personalDetails.firstName personalDetails.lastName employeeId personalDetails.email')
    .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Error fetching attendance approvals:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    // Resolve employee ID for authorization
    let currentEmployeeId = authUser.id;
    if (mongoose.Types.ObjectId.isValid(authUser.id)) {
        const emp = await Employee.findById(authUser.id).select('_id');
        if (!emp) {
            const userRec = await User.findById(authUser.id).select('employeeId email');
            if (userRec) {
                let mappedEmp = null;
                if (userRec.employeeId) {
                    mappedEmp = await Employee.findOne({ employeeId: userRec.employeeId }).select('_id');
                }
                if (!mappedEmp && userRec.email) {
                    mappedEmp = await Employee.findOne({ 'personalDetails.email': userRec.email }).select('_id');
                }
                if (mappedEmp) currentEmployeeId = mappedEmp._id.toString();
            }
        }
    }

    const body = await request.json();
    const { requestId, status, remarks } = body;

    if (!requestId || !status) {
      return NextResponse.json({ success: false, error: "ID and Status are required" }, { status: 400 });
    }

    const reg = await AttendanceRegularization.findById(requestId).populate('employee');
    if (!reg) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    // Verify authorized approver
    if (reg.approver.toString() !== currentEmployeeId) {
        // Allow admin and super_admin to override
        if (authUser.role !== 'super_admin' && authUser.role !== 'admin') {
            return NextResponse.json({ success: false, error: "Forbidden: You are not the assigned approver" }, { status: 403 });
        }
    }

    reg.status = status;
    reg.remarks = remarks;
    reg.approvedBy = currentEmployeeId;
    reg.approvedAt = new Date();
    await reg.save();

    // IF APPROVED, PERFORM ACTIONS
    if (status === 'Approved') {
      const attendanceDate = new Date(reg.date);
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const targetStatus = reg.type === 'Half-Day' ? 'Half-day' : 'Present';

      // 1. Update/Create Attendance Record
      const attendance = await Attendance.findOneAndUpdate(
        {
          employee: reg.employee._id,
          date: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          $set: {
            status: targetStatus,
            notes: `Approved ${reg.type}: ${reg.reason}${remarks ? ` | Manager Comment: ${remarks}` : ''}`,
            attendanceMethod: 'Manual'
          }
        },
        { upsert: true, new: true }
      );

      // 2. Trigger Payroll Recalculation Alert
      try {
        const month = attendanceDate.getMonth() + 1;
        const year = attendanceDate.getFullYear();
        const orgId = reg.organizationId;

        const activeRun = await PayrollRun.findOne({
          organizationId: orgId,
          month,
          year,
          status: { $in: ['Draft', 'Processing'] }
        });

        if (activeRun) {
          await PayrollRun.findByIdAndUpdate(activeRun._id, {
            $set: {
                needsRecalculation: true,
                recalculationReason: `Approved Regularization for ${reg.employee?.personalDetails?.firstName} on ${attendanceDate.toDateString()}`
            },
            $push: {
                logs: {
                    message: `Attendance updated via approval for ${reg.employee?.personalDetails?.firstName}. Recalculation advised.`,
                    level: 'warning',
                    employeeId: reg.employee?._id
                }
            }
          });
        }
      } catch (payrollErr) {
        console.error("Non-critical error updating payroll run for approval:", payrollErr);
      }
    }

    // 3. Send Email Notification to Employee
    try {
      await sendRegularizationStatusUpdateEmail({
        employeeEmail: reg.employee?.personalDetails?.email,
        date: reg.date,
        type: reg.type,
        status: reg.status,
        remarks: reg.remarks
      });
    } catch (emailErr) {
      console.error("Non-critical error sending status update email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error("Error processing attendance approval:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
