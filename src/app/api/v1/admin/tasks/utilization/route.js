import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import TimesheetEntry from '@/lib/db/models/tasks/TimesheetEntry';
import Employee from '@/lib/db/models/payroll/Employee';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "supervisor"]);
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'startDate and endDate are required' }, { status: 400 });
        }

        // Aggregate hours by employee
        const utilizationData = await TimesheetEntry.aggregate([
            {
                $match: {
                    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
                    // We'll filter by organizationId later if we link it to Entry, 
                    // for now we filter by employee's org in the next step
                }
            },
            {
                $group: {
                    _id: "$employee",
                    totalHours: { $sum: "$hours" },
                    daysWorked: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } }
                }
            }
        ]);

        // Get all employees of the organization to include those with 0 hours
        const employees = await Employee.find({
            'jobDetails.organizationId': authUser.organizationId,
            status: 'Active'
        }).select('personalDetails.firstName personalDetails.lastName employeeId');

        const report = employees.map(emp => {
            const utilization = utilizationData.find(u => u._id.toString() === emp._id.toString());
            const totalHours = utilization ? utilization.totalHours : 0;
            const daysCount = utilization ? utilization.daysWorked.length : 0;
            
            // Standard week is 40 hours. Adjust as needed.
            // Calculation: (totalHours / (expectedHours for the range)) * 100
            // For simplicity, let's assume a 8hr workday.
            const dateDiff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;
            const expectedHours = dateDiff * 8; 
            
            return {
                employeeId: emp._id,
                name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                empCode: emp.employeeId,
                totalHours,
                utilizationPercentage: expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 0,
                daysWorked: daysCount
            };
        });

        // Sort by utilization (high to low)
        report.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

        return NextResponse.json({ 
            success: true, 
            report,
            summary: {
                totalEmployees: employees.length,
                averageUtilization: report.length > 0 ? Math.round(report.reduce((acc, curr) => acc + curr.utilizationPercentage, 0) / report.length) : 0
            }
        });

    } catch (error) {
        console.error('Utilization API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
