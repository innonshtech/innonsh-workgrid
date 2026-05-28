import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import LeaveApplication from "@/lib/db/models/payroll/LeaveApplication";
import Leave from "@/lib/db/models/payroll/Leave";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";
import { calculateEffectiveLeaveDays } from "@/lib/utils/leave-calculator";
import { syncLeaveApplicationToPayroll } from "@/lib/payroll/leave-sync-engine";

// GET single leave application
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const application = await LeaveApplication.findById(id)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name email");

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        return NextResponse.json(application);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE leave application status (Approve/Reject)
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { status, rejectionReason, approvedBy } = body;

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const application = await LeaveApplication.findById(id).populate("employee", "personalDetails");
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // 1. Identify the approver's employee record
        const approverUser = await User.findById(approvedBy);
        const approverEmployee = await Employee.findOne({ userId: approvedBy });
        
        // 2. Multi-Level Logic: Update specific stage in chain if applicable
        let isFinalAuthority = approverUser?.role === 'admin' || approverUser?.role === 'super_admin';
        
        if (application.approvalChain && application.approvalChain.length > 0) {
            const stageIndex = application.approvalChain.findIndex(
                stage => stage.approverId.toString() === approverEmployee?._id?.toString()
            );

            if (stageIndex !== -1) {
                application.approvalChain[stageIndex].status = status;
                application.approvalChain[stageIndex].updatedAt = new Date();
                application.approvalChain[stageIndex].remarks = rejectionReason || 'Action taken';
                
                // Check if this specific approver holds final authority for this request
                if (application.finalApproverId && application.finalApproverId.toString() === approverEmployee._id.toString()) {
                    isFinalAuthority = true;
                }
            }
        } else {
            // Backward compatibility or no chain defined: Admins/Managers act as final
            isFinalAuthority = true;
        }

        // 3. Finalize Status only if final authority or Rejection (Manager rule)
        // Note: We only update overall status if IS_FINAL or if we want to support immediate rejection?
        // User said: "if manager is not rejected, manager approved and TL rejected, then mark as approved"
        // This means ONLY manager (final) controls the top-level status.
        
        if (isFinalAuthority) {
            application.status = status;
            application.approvedBy = approvedBy;
            application.approvedAt = new Date();
            if (status === 'Rejected') {
                application.rejectionReason = rejectionReason;
            }
        }

        await application.save();

        // 4. DEEP SYNC: ONLY trigger if the OVERALL status is now Approved
        if (application.status === "Approved" && isFinalAuthority) {
            try {
                await syncLeaveApplicationToPayroll(application._id);
            } catch (syncErr) {
                console.error("CRITICAL: Failed to sync approved leave to Payroll model:", syncErr);
            }
        }

        // Log activity
        await logActivity({
            action: status.toLowerCase(),
            entity: "LeaveApplication",
            entityId: application._id,
            description: `Leave application for ${application.employee?.personalDetails?.firstName} was ${status.toLowerCase()}`,
            performedBy: {
                userId: approvedBy,
                name: "Admin" // You can pass actual name in body if needed
            },
            details: { rejectionReason },
            req: request
        });

        return NextResponse.json(application);
    } catch (error) {
        console.error("Error in PUT /api/payroll/leave-applications/[id]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
