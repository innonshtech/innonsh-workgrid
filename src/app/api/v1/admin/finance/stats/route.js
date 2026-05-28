import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Expense from "@/lib/db/models/finance/Expense";
import PayrollRun from "@/lib/db/models/payroll/PayrollRun";

export async function GET() {
    try {
        await dbConnect();

        // 1. Total Payroll (Sum of totalGrossSalary from completed/paid payroll runs)
        const payrollData = await PayrollRun.aggregate([
            { $match: { status: { $in: ['Completed', 'Approved', 'Locked', 'Published', 'Paid'] } } },
            { $group: { _id: null, total: { $sum: '$totalGrossSalary' } } }
        ]);

        // 2. Total Expenses (Sum of amount from Expenses that are not Draft or Rejected)
        const expenseData = await Expense.aggregate([
            { $match: { status: { $nin: ['Draft', 'Rejected'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // 3. Pending Reimbursements
        const pendingReimbursements = await Expense.aggregate([
            { $match: { status: 'Pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // 4. Paid Amount
        const paidAmount = await Expense.aggregate([
            { $match: { status: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // 5. Alerts Data
        const pendingApprovalsCount = await Expense.countDocuments({ status: 'Pending' });
        const pendingPaymentsCount = await Expense.countDocuments({ status: 'Approved' });
        const payrollPendingCount = await PayrollRun.countDocuments({ status: { $in: ['Draft', 'Processing'] } });

        // 6. Recent Activity
        const recentExpenses = await Expense.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title status amount createdAt')
            .lean();

        const recentPayroll = await PayrollRun.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('month year status createdAt')
            .lean();

        // Map and combine recent activities
        let activities = [];
        
        recentExpenses.forEach(exp => {
            let actionType = 'Expense submitted';
            if (exp.status === 'Approved') actionType = 'Approved';
            if (exp.status === 'Paid') actionType = 'Paid';
            if (exp.status === 'Rejected') actionType = 'Rejected';
            
            activities.push({
                id: exp._id.toString(),
                type: 'expense',
                action: actionType,
                title: exp.title,
                timestamp: exp.createdAt
            });
        });

        recentPayroll.forEach(pr => {
            let actionType = 'Payroll processed';
            if (pr.status === 'Draft') actionType = 'Payroll drafted';
            
            activities.push({
                id: pr._id.toString(),
                type: 'payroll',
                action: actionType,
                title: `Run for ${pr.month}/${pr.year}`,
                timestamp: pr.createdAt
            });
        });

        // Sort combined activities by timestamp desc and take top 5
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        activities = activities.slice(0, 5);

        return NextResponse.json({
            stats: {
                totalPayroll: payrollData[0]?.total || 0,
                totalExpenses: expenseData[0]?.total || 0,
                pendingReimbursements: pendingReimbursements[0]?.total || 0,
                paidAmount: paidAmount[0]?.total || 0
            },
            alerts: {
                pendingApprovals: pendingApprovalsCount,
                pendingPayments: pendingPaymentsCount,
                payrollPending: payrollPendingCount
            },
            recentActivity: activities
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
