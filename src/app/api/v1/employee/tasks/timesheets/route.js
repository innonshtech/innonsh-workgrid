import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import TimesheetEntry from '@/lib/db/models/tasks/TimesheetEntry';
import Employee from '@/lib/db/models/payroll/Employee';
import Notification from '@/lib/db/models/notifications/NotificationConfig';
import { getAuthUser } from '@/lib/auth-util';
import { logActivity } from '@/lib/logger';


export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        let employeeId = searchParams.get('employeeId');
        const weekStartDate = searchParams.get('weekStartDate');
        const status = searchParams.get('status');

        // Enforcement: Employees can only see their own timesheets
        if (authUser.role === "employee") {
            employeeId = authUser.id;
        }

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
        const authUser = await getAuthUser();
        await dbConnect();
        const body = await request.json();
        const { employee, weekStartDate, entries, status = 'Draft', submittedTo } = body;

        // Security Validation
        if (authUser.role === 'employee' && employee !== authUser.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Cannot log hours for other employees' }, { status: 403 });
        }

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
                status,
                submittedTo: submittedTo || null,
                organizationId: orgId // Ensure robust orgId is saved
            });
        } else {
            // If already approved, don't allow changes
            if (timesheet.status === 'Approved') {
                return NextResponse.json({ success: false, error: 'Cannot edit an approved timesheet' }, { status: 400 });
            }
            timesheet.status = status;
            timesheet.submittedTo = submittedTo || null;
            if (orgId) {
                timesheet.organizationId = orgId;
            }
        }

        if (status === 'Submitted') {
            timesheet.submittedAt = new Date();
        }

        // 2. Handle Entries
        if (entries && Array.isArray(entries)) {
            // Calculate total hours
            const totalHours = entries.reduce((acc, entry) => acc + (parseFloat(entry.hours) || 0), 0);
            timesheet.totalHours = totalHours;

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

        // Create notifications on submission
        if (status === 'Submitted') {
            const formattedDate = new Date(weekStartDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const employeeDetails = await Employee.findById(employee);
            const employeeName = employeeDetails 
                ? `${employeeDetails.personalDetails?.firstName} ${employeeDetails.personalDetails?.lastName}`
                : authUser.name || 'An employee';

            // 1. Notify the selected manager (individual notification)
            if (submittedTo) {
                try {
                    const managerNotification = new Notification({
                        type: 'system',
                        title: 'Timesheet Submitted for Approval',
                        message: `${employeeName} has submitted their timesheet for the week of ${formattedDate} for your approval.`,
                        priority: 'medium',
                        audienceType: 'individual',
                        employee: submittedTo,
                        organization: authUser.organizationId,
                        details: {
                            timesheetId: timesheet._id,
                            employeeId: employee,
                            weekStartDate: weekStartDate
                        }
                    });
                    await managerNotification.save();
                } catch (notiError) {
                    console.error('Failed to save manager timesheet notification:', notiError);
                }
            }

            // 2. Notify the organization admins (organization audience)
            try {
                const adminNotification = new Notification({
                    type: 'system',
                    title: 'New Timesheet Submission',
                    message: `${employeeName} has submitted their timesheet for the week of ${formattedDate}.`,
                    priority: 'medium',
                    audienceType: 'organization',
                    organization: authUser.organizationId,
                    details: {
                        timesheetId: timesheet._id,
                        employeeId: employee,
                        weekStartDate: weekStartDate
                    }
                });
                await adminNotification.save();
            } catch (notiError) {
                console.error('Failed to save admin timesheet notification:', notiError);
            }
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
