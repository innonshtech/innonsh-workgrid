import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceRegularization from "@/lib/db/models/payroll/AttendanceRegularization";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser } from "@/lib/auth-util";
import { sendAttendanceRegularizationRequestEmail } from "@/utils/notifications";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const body = await request.json();
    const { date, type, reason, approverId, halfDaySlot, requestedTime } = body;

    if (!date || !type || !reason || !approverId) {
      return NextResponse.json(
        { success: false, error: "Date, type, reason, and approver are required" },
        { status: 400 }
      );
    }

    // 1. Fetch Requesting Employee
    const employee = await Employee.findById(authUser.id);
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    // 2. Fetch Selected Approver
    const approver = await Employee.findById(approverId).select('personalDetails.email');
    if (!approver) {
      return NextResponse.json({ success: false, error: "Selected approver not found" }, { status: 404 });
    }

    // 3. Create Regularization Request
    const regularization = await AttendanceRegularization.create({
      employee: authUser.id,
      date: new Date(date),
      type,
      reason,
      approver: approverId,
      halfDaySlot: halfDaySlot || 'None',
      requestedTime: requestedTime || null,
      status: 'Pending',
      organizationId: employee.jobDetails?.organizationId || authUser.organizationId
    });

    // 4. Send Email Notification to Approver
    try {
      await sendAttendanceRegularizationRequestEmail({
        employeeName: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
        date: regularization.date,
        type: regularization.type,
        reason: regularization.reason,
        approverEmail: approver.personalDetails?.email
      });
    } catch (emailErr) {
      console.error("Non-critical error sending regularization email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      data: regularization,
      message: "Request submitted successfully"
    });

  } catch (error) {
    console.error("Error creating attendance regularization:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    let filter = { employee: authUser.id };
    if (status) filter.status = status;

    const requests = await AttendanceRegularization.find(filter)
      .populate('approver', 'personalDetails.firstName personalDetails.lastName')
      .sort({ date: -1 });

    return NextResponse.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Error fetching attendance regularizations:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
