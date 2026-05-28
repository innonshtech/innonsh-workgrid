
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import Payslip from '@/lib/db/models/payroll/Payslip';
import Employee from '@/lib/db/models/payroll/Employee';
import { generateBankAdviceCSV } from '@/lib/utils/payout-generator';
import NotificationConfig from '@/lib/db/models/notifications/NotificationConfig';
import { getAuthUser, authorize } from '@/lib/auth-util';

// We need a way to send notifications. 
// If there isn't a unified service, we'll create a simple one or use the model directly.
// Checking existing notification system...

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();
        const { payrollRunId, action } = body;

        const payrollRun = await PayrollRun.findById(payrollRunId);
        if (!payrollRun) {
            return NextResponse.json({ error: 'Payroll Run not found' }, { status: 404 });
        }

        // SaaS PROTECTION: Admin can only process payroll in their org
        if (authUser.role === 'admin' && payrollRun.organizationId?.toString() !== authUser.organizationId) {
            return NextResponse.json({ error: 'Forbidden: Not your organization' }, { status: 403 });
        }

        if (action === 'generate_advice') {
            // Fetch all payslips for this run with employee bank details
            const payslips = await Payslip.find({ payrollRunId })
                .populate({
                    path: 'employee',
                    select: 'personalDetails.firstName personalDetails.lastName personalDetails.email personalDetails.phone salaryDetails.bankAccount'
                });

            const csvContent = generateBankAdviceCSV(payslips.map(p => ({
                ...p.toObject(),
                employee: p.employee // Remap for utility
            })));

            // In a real app, upload CSV to cloud storage (S3/Cloudinary) and save URL.
            // For now, we'll return the content directly or a data URI for client download.
            // But updating status is important.

            payrollRun.payoutStatus = 'Processing';
            await payrollRun.save();

            return NextResponse.json({
                message: 'Bank advice generated',
                csvContent,
                fileName: `Salary_Payout_${payrollRun.month}_${payrollRun.year}.csv`
            });
        } else if (action === 'mark_paid') {
            // Update status
            payrollRun.payoutStatus = 'Completed';
            payrollRun.payoutDate = new Date();
            await payrollRun.save();

            // NOTIFICATION LOGIC
            const payslips = await Payslip.find({ payrollRunId }).populate('employee');

            const notifications = payslips.map(slip => ({
                type: 'salary-payout',
                title: 'Salary Credited',
                message: `Your salary for ${payrollRun.month}/${payrollRun.year} has been processed. Net Payable: ₹${slip.netSalary.toFixed(2)}`,
                priority: 'high',
                employee: slip.employee._id,
                organization: payrollRun.organizationId,
                read: false,
                emailSent: false, // In a real system, we'd trigger email here too
                details: {
                    payrollRunId: payrollRun._id,
                    payslipId: slip._id,
                    amount: slip.netSalary,
                    month: payrollRun.month,
                    year: payrollRun.year
                }
            }));

            if (notifications.length > 0) {
                await NotificationConfig.insertMany(notifications);
            }

            return NextResponse.json({ message: 'Payout marked as completed and notifications sent' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Payout API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
