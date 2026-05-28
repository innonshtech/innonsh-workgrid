import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import { logActivity } from '@/lib/logger';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const timesheet = await Timesheet.findById(id)
            .populate('employee', 'personalDetails.firstName personalDetails.lastName employeeId');

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
        const body = await request.json();
        const { status, adminNotes, approvedBy } = body;

        const timesheet = await Timesheet.findById(id);
        if (!timesheet) return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });

        if (status) timesheet.status = status;
        if (adminNotes !== undefined) timesheet.adminNotes = adminNotes;
        if (status === 'Approved') {
            timesheet.approvedBy = approvedBy;
            timesheet.approvedAt = new Date();
        }

        await timesheet.save();

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
