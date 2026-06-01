import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import Notification from '@/lib/db/models/notifications/NotificationConfig';
import { logActivity } from '@/lib/logger';
import { getAuthUser } from '@/lib/auth-util';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const timesheet = await Timesheet.findOne({
            _id: id,
            organizationId: authUser.organizationId
        }).populate('employee', 'personalDetails.firstName personalDetails.lastName employeeId');

        if (!timesheet) return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });

        return NextResponse.json({ success: true, timesheet });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, adminNotes, approvedBy, rejectionReason } = body;

        const timesheet = await Timesheet.findOne({
            _id: id,
            organizationId: authUser.organizationId
        });
        if (!timesheet) return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });

        if (status) timesheet.status = status;
        if (adminNotes !== undefined) timesheet.adminNotes = adminNotes;
        if (rejectionReason !== undefined) timesheet.rejectionReason = rejectionReason;

        if (status === 'Approved') {
            timesheet.approvedBy = approvedBy || authUser.id;
            timesheet.approvedAt = new Date();
        }

        await timesheet.save();

        // Send a notification to the employee
        try {
            const formattedDate = new Date(timesheet.weekStartDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const statusText = status === 'Approved' ? 'Approved' : 'Rejected';

            const notification = new Notification({
                type: 'system',
                title: `Timesheet ${statusText}`,
                message: `Your timesheet for the week of ${formattedDate} has been ${statusText.toLowerCase()}${status === 'Rejected' && rejectionReason ? `: "${rejectionReason}"` : '.'}`,
                priority: status === 'Approved' ? 'medium' : 'high',
                audienceType: 'individual',
                employee: timesheet.employee,
                organization: timesheet.organizationId,
                details: {
                    timesheetId: timesheet._id,
                    status: status,
                    weekStartDate: timesheet.weekStartDate,
                    rejectionReason: rejectionReason || ''
                }
            });
            await notification.save();
        } catch (notiError) {
            console.error('Failed to send timesheet status update notification:', notiError);
        }

        await logActivity({
            action: status.toLowerCase(),
            entity: "Timesheet",
            entityId: timesheet._id,
            description: `${status} timesheet for week starting ${timesheet.weekStartDate}`,
            req: request
        });

        return NextResponse.json({ success: true, timesheet });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
