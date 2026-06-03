import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import TimesheetEntry from '@/lib/db/models/tasks/TimesheetEntry';
import Employee from '@/lib/db/models/payroll/Employee';
import { logActivity } from '@/lib/logger';
import { getAuthUser } from '@/lib/auth-util';

export const dynamic = 'force-dynamic';

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
        const submittedTo = searchParams.get('submittedTo');

        // Robust Organization ID resolution
        let orgId = authUser.organizationId;
        if (!orgId) {
            const emp = await Employee.findById(authUser.id || authUser._id);
            if (emp && emp.jobDetails?.organizationId) {
                orgId = emp.jobDetails.organizationId.toString();
            }
        }

        let query = {};
        if (orgId) query.organizationId = orgId;
        if (employeeId) query.employee = employeeId;
        if (weekStartDate) query.weekStartDate = new Date(weekStartDate);
        if (status) query.status = status;
        if (submittedTo) {
            if (submittedTo === 'null') {
                query.submittedTo = null;
            } else {
                query.submittedTo = submittedTo;
            }
        }

        const timesheets = await Timesheet.find(query)
            .populate('employee', 'personalDetails.firstName personalDetails.lastName')
            .populate('submittedTo', 'personalDetails.firstName personalDetails.lastName')
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
            }, {
                headers: {
                    'Cache-Control': 'no-store, max-age=0, must-revalidate'
                }
            });
        }

        return NextResponse.json({ success: true, timesheets }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate'
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, {
            status: 500,
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate'
            }
        });
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

        // Robust Organization ID resolution
        let orgId = authUser.organizationId;
        if (!orgId) {
            const emp = await Employee.findById(authUser.id || authUser._id);
            if (emp && emp.jobDetails?.organizationId) {
                orgId = emp.jobDetails.organizationId.toString();
            }
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
                organizationId: orgId,
                status
            });
        } else {
            // If already submitted or approved, don't allow changes unless admin?
            // For now, let's keep it simple.
            if (timesheet.status === 'Approved') {
                return NextResponse.json({ success: false, error: 'Cannot edit an approved timesheet' }, { status: 400 });
            }
            timesheet.status = status;
            if (orgId) {
                timesheet.organizationId = orgId;
            }
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
                const projectId = entry.project && typeof entry.project === 'object'
                    ? (entry.project._id || entry.project)
                    : entry.project;

                const taskId = entry.task && typeof entry.task === 'object'
                    ? (entry.task._id || entry.task)
                    : entry.task;

                const newEntry = {
                    ...entry,
                    project: projectId,
                    task: taskId,
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
