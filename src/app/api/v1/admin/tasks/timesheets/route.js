import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import TimesheetEntry from '@/lib/db/models/tasks/TimesheetEntry';
import { logActivity } from '@/lib/logger';
import { getAuthUser } from '@/lib/auth-util';

export async function GET(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const weekStartDate = searchParams.get('weekStartDate');
        const status = searchParams.get('status');

        let query = { organizationId: authUser.organizationId };
        if (employeeId) query.employee = employeeId;
        if (weekStartDate) query.weekStartDate = new Date(weekStartDate);
        if (status) query.status = status;

        const timesheets = await Timesheet.find(query)
            .populate('employee', 'personalDetails.firstName personalDetails.lastName')
            .sort({ weekStartDate: -1 });

        // If fetching for a specific week and employee, include entries
        if (employeeId && weekStartDate && timesheets.length > 0) {
            const entries = await TimesheetEntry.find({ timesheet: timesheets[0]._id })
                .populate('project', 'name')
                .populate('task', 'title');

            return NextResponse.json({
                success: true,
                timesheet: timesheets[0],
                entries
            });
        }

        return NextResponse.json({ success: true, timesheets });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { employee, weekStartDate, entries, status = 'Draft' } = body;

        if (!employee || !weekStartDate) {
            return NextResponse.json({ success: false, error: 'Employee and weekStartDate are required' }, { status: 400 });
        }

        // 1. Find or Create Timesheet
        let timesheet = await Timesheet.findOne({
            employee,
            weekStartDate: new Date(weekStartDate)
        });

        if (!timesheet) {
            timesheet = new Timesheet({
                employee,
                weekStartDate: new Date(weekStartDate),
                organizationId: authUser.organizationId,
                status
            });
        } else {
            // If already submitted or approved, don't allow changes unless admin?
            // For now, let's keep it simple.
            if (timesheet.status === 'Approved') {
                return NextResponse.json({ success: false, error: 'Cannot edit an approved timesheet' }, { status: 400 });
            }
            timesheet.status = status;
        }

        // 2. Handle Entries
        if (entries && Array.isArray(entries)) {
            // Calculate total hours
            const totalHours = entries.reduce((acc, entry) => acc + (parseFloat(entry.hours) || 0), 0);
            timesheet.totalHours = totalHours;
            if (status === 'Submitted') timesheet.submittedAt = new Date();

            await timesheet.save();

            // Clear existing entries and recreate
            await TimesheetEntry.deleteMany({ timesheet: timesheet._id });

            const entriesToCreate = entries.map(entry => {
                const newEntry = {
                    ...entry,
                    timesheet: timesheet._id,
                    employee
                };
                if (!newEntry.task || newEntry.task === '') {
                    delete newEntry.task;
                }
                return newEntry;
            });

            await TimesheetEntry.insertMany(entriesToCreate);
        } else {
            await timesheet.save();
        }

        await logActivity({
            action: status === 'Submitted' ? 'submitted' : 'saved',
            entity: "Timesheet",
            entityId: timesheet._id,
            description: `${status === 'Submitted' ? 'Submitted' : 'Saved Draft'} timesheet for week starting ${weekStartDate}`,
            req: request
        });

        return NextResponse.json({ success: true, timesheet });
    } catch (error) {
        console.error('Timesheet POST Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
