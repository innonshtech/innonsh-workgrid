import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/lib/db/models/tasks/Project';
import Task from '@/lib/db/models/tasks/Task';
import Timesheet from '@/lib/db/models/tasks/Timesheet';
import Employee from '@/lib/db/models/payroll/Employee';
import { getAuthUser, authorize } from '@/lib/auth-util';
import TimesheetEntry from '@/lib/db/models/tasks/TimesheetEntry';
import ActivityLog from '@/lib/db/models/ActivityLog';

export async function GET(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        const organizationId = authUser.organizationId;

        const [
            totalProjects,
            activeProjects,
            totalTasks,
            completedTasks,
            totalEmployees,
            pendingTimesheets,
            tasks
        ] = await Promise.all([
            Project.countDocuments({ organizationId }),
            Project.countDocuments({ organizationId, status: { $ne: 'Completed' } }),
            Task.countDocuments({ organizationId }),
            Task.countDocuments({ organizationId, status: 'Completed' }),
            Employee.countDocuments({ 'jobDetails.organizationId': organizationId, status: 'Active' }),
            Timesheet.countDocuments({ organizationId, status: 'Submitted' }),
            Task.find({ organizationId }, 'progress')
        ]);

        const averageProgress = tasks.length > 0 
            ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length)
            : 0;

        // Fetch Detailed Project Data
        const topProjects = await Project.find({ organizationId, status: { $ne: 'Completed' } })
            .populate('projectManager', 'personalDetails.firstName personalDetails.lastName')
            .limit(5)
            .lean();

        const projectDetails = await Promise.all(topProjects.map(async (p) => {
            const projectTasks = await Task.find({ project: p._id }, 'progress');
            const progress = projectTasks.length > 0
                ? Math.round(projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / projectTasks.length)
                : 0;
            return {
                ...p,
                progress,
                taskCount: projectTasks.length
            };
        }));

        // Fetch Top Contributors (Past 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const contributors = await TimesheetEntry.aggregate([
            { $match: { date: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$employee', totalHours: { $sum: '$hours' } } },
            { $sort: { totalHours: -1 } },
            { $limit: 5 }
        ]);

        const populatedContributors = await Employee.populate(contributors, {
            path: '_id',
            select: 'personalDetails.firstName personalDetails.lastName'
        });

        // Recent Activity
        const recentActivity = await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        return NextResponse.json({
            success: true,
            stats: {
                totalProjects,
                activeProjects,
                totalTasks,
                completedTasks,
                totalEmployees,
                pendingTimesheets,
                averageProgress,
                topProjects: projectDetails,
                topContributors: populatedContributors.map(c => ({
                    name: c._id ? `${c._id.personalDetails.firstName} ${c._id.personalDetails.lastName}` : 'Unknown',
                    hours: c.totalHours
                })),
                recentActivity
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
