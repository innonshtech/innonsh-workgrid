import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import LeaveApplication from '@/lib/db/models/payroll/LeaveApplication';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import { getAuthUser, authorize } from '@/lib/auth-util';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ['employee', 'admin', 'hr', 'company_admin', 'super_admin']);
        await dbConnect();

        // 1. Resolve current employee
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
            return NextResponse.json({ success: true, data: [] });
        }

        // 2. Find pending applications assigned to this employee's ID
        const applications = await LeaveApplication.find({
            'approvalChain': {
                $elemMatch: {
                    approverId: currentEmployee._id,
                    status: 'Pending'
                }
            },
            status: 'Pending' // The global request itself must be pending
        })
        .populate('employee', 'personalDetails.firstName personalDetails.lastName personalDetails.thumbnail employeeId jobDetails.designation')
        .sort({ createdAt: -1 });

        // Format data to expose necessary fields
        const formattedData = applications.map(app => {
            const step = app.approvalChain.find(s => s.approverId.toString() === currentEmployee._id.toString());
            return {
                _id: app._id,
                employee: app.employee,
                leaveType: app.leaveType,
                startDate: app.startDate,
                endDate: app.endDate,
                totalDays: app.totalDays,
                reason: app.reason,
                createdAt: app.createdAt,
                attachments: app.attachments,
                myApprovalRole: step?.level,
                isFinalApprover: app.finalApproverId?.toString() === currentEmployee._id.toString()
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error fetching team approvals:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
