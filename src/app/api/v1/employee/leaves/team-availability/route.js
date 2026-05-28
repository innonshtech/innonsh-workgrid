import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import LeaveApplication from '@/lib/db/models/payroll/LeaveApplication';
import { getAuthUser, authorize } from '@/lib/auth-util';

import mongoose from 'mongoose';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ['employee', 'admin', 'hr', 'company_admin', 'super_admin']);
        await dbConnect();

        // 1. Get the current employee's profile to identify their team
        let currentEmployee = null;
        if (mongoose.Types.ObjectId.isValid(authUser.id)) {
            currentEmployee = await Employee.findById(authUser.id);
            if (!currentEmployee) {
                const User = mongoose.models.User || mongoose.model('User');
                const userRecord = await User.findById(authUser.id);
                if (userRecord && userRecord.employeeId) {
                    currentEmployee = await Employee.findOne({ employeeId: userRecord.employeeId });
                }
            }
        }

        if (!currentEmployee) {
            return NextResponse.json({ success: true, data: [] });
        }

        const { reportingManager, teamId } = currentEmployee.jobDetails || {};

        if (!reportingManager && !teamId) {
            return NextResponse.json({ success: true, data: [], message: "No team context found" });
        }

        // 2. Find teammate IDs
        // "Team" = same reporting manager OR same project team
        const teammates = await Employee.find({
            $and: [
                { _id: { $ne: currentEmployee._id } }, // Exclude self
                {
                    $or: [
                        { "jobDetails.reportingManager": reportingManager || null },
                        { "jobDetails.teamId": teamId || null }
                    ].filter(cond => Object.values(cond)[0] !== null)
                }
            ],
            status: 'Active'
        }).distinct('_id');

        if (teammates.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 3. Fetch approved leave applications for these teammates
        // We look for leaves that are active today or starting in the next 14 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const fourteenDaysLater = new Date();
        fourteenDaysLater.setDate(today.getDate() + 14);
        fourteenDaysLater.setHours(23, 59, 59, 999);

        const activeLeaves = await LeaveApplication.find({
            employee: { $in: teammates },
            status: 'Approved',
            $or: [
                // Currently active
                { startDate: { $lte: new Date() }, endDate: { $gte: today } },
                // Starting soon
                { startDate: { $gte: today, $lte: fourteenDaysLater } }
            ]
        })
        .populate('employee', 'personalDetails.firstName personalDetails.lastName jobDetails.designation employeeId')
        .sort({ startDate: 1 });

        // 4. Format data for the dashboard
        const formattedData = activeLeaves.map(leave => ({
            _id: leave._id,
            employeeName: `${leave.employee.personalDetails.firstName} ${leave.employee.personalDetails.lastName}`,
            designation: leave.employee.jobDetails.designation,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: leave.totalDays,
            isToday: new Date(leave.startDate) <= new Date() && new Date(leave.endDate) >= today,
            leaveType: leave.leaveType
        }));

        return NextResponse.json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error('Error fetching team availability:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
