import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import LeaveApplication from '@/lib/db/models/payroll/LeaveApplication';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { logActivity } from '@/lib/logger';
import { syncLeaveApplicationToPayroll } from '@/lib/payroll/leave-sync-engine';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        
        const authUser = await getAuthUser();
        authorize(authUser, ['employee', 'admin', 'hr', 'company_admin', 'super_admin']);
        await dbConnect();

        const body = await request.json();
        const { action, remarks } = body;

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Resolve current employee
        let currentEmployee = null;
        if (mongoose.Types.ObjectId.isValid(authUser.id)) {
            currentEmployee = await Employee.findById(authUser.id);
            if (!currentEmployee) {
                const userRecord = await User.findById(authUser.id);
                if (userRecord && userRecord.employeeId) {
                    currentEmployee = await Employee.findOne({ employeeId: userRecord.employeeId });
                }
            }
        }

        if (!currentEmployee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        const application = await LeaveApplication.findById(id).populate('employee', 'personalDetails.firstName personalDetails.lastName');
        if (!application) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // Find the approver's step in the chain
        const stepIndex = application.approvalChain.findIndex(
            step => step.approverId?.toString() === currentEmployee._id.toString()
        );

        if (stepIndex === -1) {
            return NextResponse.json({ error: 'You are not authorized to approve this request' }, { status: 403 });
        }

        if (application.approvalChain[stepIndex].status !== 'Pending') {
            return NextResponse.json({ error: 'You have already actioned this request' }, { status: 400 });
        }

        // Process Action
        if (action === 'reject') {
            application.approvalChain[stepIndex].status = 'Rejected';
            application.approvalChain[stepIndex].remarks = remarks;
            application.approvalChain[stepIndex].updatedAt = new Date();
            
            application.status = 'Rejected';
            application.rejectionReason = remarks || `Rejected by ${currentEmployee.personalDetails?.firstName}`;
        } else if (action === 'approve') {
            application.approvalChain[stepIndex].status = 'Approved';
            application.approvalChain[stepIndex].remarks = remarks;
            application.approvalChain[stepIndex].updatedAt = new Date();
            
            // Check if this was the final approver
            if (application.finalApproverId?.toString() === currentEmployee._id.toString()) {
                application.status = 'Approved';
                application.approvedBy = currentEmployee._id; 
                application.approvedAt = new Date();
            }
        }

        await application.save();

        // Trigger Sync Engine if fully approved
        if (application.status === 'Approved') {
            try {
                await syncLeaveApplicationToPayroll(application._id);
            } catch (syncError) {
                console.error('Failed to sync leave to payroll:', syncError);
                // We don't fail the request, but we log the error
            }
        }

        // Log activity
        await logActivity({
            action: action === 'approve' ? 'approved' : 'rejected',
            entity: "LeaveApplication",
            entityId: application._id,
            description: `${currentEmployee.personalDetails?.firstName} ${action}d leave request for ${application.employee?.personalDetails?.firstName}`,
            performedBy: {
                userId: authUser.id,
                name: authUser.name
            },
            req: request
        });

        return NextResponse.json({ success: true, application });

    } catch (error) {
        console.error('Error actioning leave request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
