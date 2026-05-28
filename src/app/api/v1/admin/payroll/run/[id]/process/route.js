import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import Employee from '@/lib/db/models/payroll/Employee';
import Attendance from '@/lib/db/models/payroll/Attendance';
import Payslip from '@/lib/db/models/payroll/Payslip';
import RetroAdjustment from '@/lib/db/models/payroll/RetroAdjustment';
import PayrollVariableInput from '@/lib/db/models/payroll/PayrollVariableInput';
import VariablePayConfig from '@/lib/db/models/payroll/VariablePayConfig';
import StatutoryConfig from '@/lib/db/models/payroll/StatutoryConfig';
import PayrollConfig from '@/lib/db/models/payroll/PayrollConfig';
import { logActivity } from '@/lib/logger';

export async function POST(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { performedBy } = body;

        const run = await PayrollRun.findById(id);
        if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
        if (run.status === 'Locked' || run.status === 'Cancelled') {
            return NextResponse.json({ error: "Cannot process a Locked or Cancelled payroll run." }, { status: 400 });
        }

        run.status = 'Processing';
        run.logs.push({ message: "Started recalculation...", level: 'info' });
        await run.save();

        // Fetch active employees for this organization
        const employees = await Employee.find({
            'jobDetails.organizationId': run.organizationId,
            status: 'Active'
        });

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let processedCount = 0;
        let failedCount = 0;

        // Define period dates
        const startDate = run.periodStart;
        const endDate = run.periodEnd;
        const daysInMonth = new Date(run.year, run.month, 0).getDate();

        // Fetch Global Payroll Config for OT and other rules
        const payrollConfig = await PayrollConfig.findOne({ company: run.organizationId });

        for (const employee of employees) {
            try {
                // 0. Populate necessary refs
                await employee.populate('jobDetails.organizationId');

                // 1. Fetch Statutory Config for Employee's State
                const workState = employee.jobDetails?.workState || 'Maharashtra';
                const statutoryConfig = await StatutoryConfig.findOne({ 
                    state: { $regex: new RegExp(`^${workState}$`, 'i') } 
                });

                // 2. Run Unified Calculation Engine (Async)
                // This now handles Attendance, Leaves, Overtime, Loans, Retros, and Variable Pay
                const salaryCalc = await employee.calculateSalaryComponents(statutoryConfig, {
                    month: run.month,
                    year: run.year,
                    payrollConfig: payrollConfig
                });

                // 3. Create/Update Payslip Payload
                const payslipId = `PSL-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
                
                const payslipData = {
                    payrollRunId: run._id,
                    employee: employee._id,
                    month: run.month,
                    year: run.year,
                    basicSalary: Math.round(salaryCalc.basicSalary),
                    grossSalary: Math.round(salaryCalc.totalEarnings),
                    totalDeductions: Math.round(salaryCalc.totalDeductions),
                    netSalary: Math.round(salaryCalc.netSalary),
                    earnings: salaryCalc.earnings.map(e => ({
                        type: e.name,
                        amount: Math.round(e.calculatedAmount),
                        calculationType: e.calculationType || 'fixed',
                        percentage: e.percentage || 0
                    })),
                    deductions: salaryCalc.deductions.map(d => ({
                        type: d.name,
                        amount: Math.round(d.calculatedAmount),
                        calculationType: d.calculationType || 'fixed',
                        percentage: d.percentage || 0
                    })),
                    workingDays: salaryCalc.workingDays,
                    presentDays: salaryCalc.presentDays,
                    lopDays: salaryCalc.lopDays || 0,
                    leaveDays: (salaryCalc.paidLeaves || 0) + (salaryCalc.lopDays || 0),
                    paidLeaveDays: salaryCalc.paidLeaves || 0,
                    totalDays: salaryCalc.totalDays,
                    weeklyOffs: salaryCalc.weeklyOffs,
                    holidays: salaryCalc.holidays,
                    status: 'Draft',
                    organizationId: run.organizationId,
                    organizationName: employee.jobDetails?.organizationId?.name || "N/A",
                    salaryType: salaryCalc.salaryType,
                    generatedBy: run.generatedBy,
                    overtimeHours: salaryCalc.overtimeHours || 0,
                    overtimeAmount: salaryCalc.overtimeAmount || 0,
                    loanDeductions: salaryCalc.loanDeductions || 0,
                    paymentMethod: employee.salaryDetails?.bankAccount?.accountNumber ? "Bank Transfer" : "Manual",
                    paymentDetails: employee.salaryDetails?.bankAccount || {}
                };

                // Upsert Payslip
                const existingPayslip = await Payslip.findOne({ employee: employee._id, month: run.month, year: run.year });
                if (existingPayslip) {
                    await Payslip.findByIdAndUpdate(existingPayslip._id, payslipData);
                } else {
                    payslipData.payslipId = payslipId;
                    await Payslip.create(payslipData);
                }

                // 4. Update Retros to 'Applied'
                if (salaryCalc.retroList && salaryCalc.retroList.length > 0) {
                    await RetroAdjustment.updateMany(
                        { _id: { $in: salaryCalc.retroList.map(r => r.retroId) } },
                        { status: 'Applied', appliedInMonth: run.month, appliedInYear: run.year }
                    );
                }

                totalGross += Math.round(salaryCalc.totalEarnings);
                totalDeductions += Math.round(salaryCalc.totalDeductions);
                totalNet += Math.round(salaryCalc.netSalary);
                processedCount++;

            } catch (err) {
                console.error(`Error processing employee ${employee.employeeId} (${employee.personalDetails.firstName} ${employee.personalDetails.lastName}):`, err);
                failedCount++;
                run.logs.push({
                    message: `Failed for ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId}): ${err.message}`,
                    level: 'error',
                    employeeId: employee._id
                });
            }
        }

        // Final Update to PayrollRun Document (Use findByIdAndUpdate for total reliability)
        const updatedRun = await PayrollRun.findByIdAndUpdate(id, {
            $set: {
                status: 'Draft',
                totalEmployees: employees.length,
                processedEmployees: processedCount,
                employeesProcessed: processedCount, // For UI compatibility
                failedEmployeesCount: failedCount,
                totalGrossSalary: Math.round(totalGross),
                totalDeductions: Math.round(totalDeductions),
                totalNetSalary: Math.round(totalNet),
                needsRecalculation: false,
                recalculationReason: null
            },
            $push: {
                logs: { message: `Recalculation finished. ${processedCount} succeeded, ${failedCount} failed.`, level: 'info' }
            }
        }, { new: true });

        return NextResponse.json({
            message: "Batch processing completed",
            processedCount,
            failedCount,
            run: updatedRun,
            totals: { totalGross, totalDeductions, totalNet }
        });

    } catch (error) {
        console.error("Batch Processor Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
