import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import Employee from '@/lib/db/models/payroll/Employee';
import Attendance from '@/lib/db/models/payroll/Attendance';
import Payslip from '@/lib/db/models/payroll/Payslip';
import RetroAdjustment from '@/lib/db/models/payroll/RetroAdjustment';
import PayrollVariableInput from '@/lib/db/models/payroll/PayrollVariableInput';
import VariablePayConfig from '@/lib/db/models/payroll/VariablePayConfig';
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
        run.logs.push({ message: "Started batch processing...", level: 'info' });
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

        for (const employee of employees) {
            try {
                // 0. Populate necessary refs
                await employee.populate('jobDetails.organizationId');

                // 1. Calculate Attendance-based LOP
                const attendance = await Attendance.find({
                    employee: employee._id,
                    date: { $gte: startDate, $lte: endDate },
                    status: { $in: ['Absent', 'Leave'] }
                });

                // Simplified LOP: Count any 'Absent' or unpaid 'Leave'
                const lopDays = attendance.length;

                const retros = await RetroAdjustment.find({
                    employeeId: employee._id,
                    status: 'Pending',
                    // Optionally filter for retros intended for this specific month
                });

                // 2.5 Fetch Variable Pay Inputs
                const variableInputs = await PayrollVariableInput.find({
                    payrollRunId: run._id,
                    employeeId: employee._id
                });

                // Fetch component names for display
                // Optimization: We could cache these outside the loop
                const variableComponents = await VariablePayConfig.find({
                    _id: { $in: variableInputs.map(v => v.componentId) }
                });
                const componentMap = {};
                variableComponents.forEach(c => componentMap[c._id.toString()] = c.name);

                // 3. Run Calculation Engine
                const payrollData = employee.calculateSalaryComponents({
                    workingDaysInMonth: daysInMonth,
                    lopDays: lopDays,
                    month: run.month
                });

                // Add Retros to calculations
                let retroEarningTotal = retros.filter(r => r.type === 'Earning').reduce((sum, r) => sum + r.amount, 0);
                let retroDeductionTotal = retros.filter(r => r.type === 'Deduction').reduce((sum, r) => sum + r.amount, 0);

                // Add Variable Pay to calculations
                let variablePayTotal = variableInputs.reduce((sum, v) => sum + v.payoutAmount, 0);

                // Adjust final numbers
                const finalGross = payrollData.totalEarnings + retroEarningTotal + variablePayTotal;
                const finalDeductions = payrollData.totalDeductions + retroDeductionTotal;
                const finalNet = finalGross - finalDeductions;

                // 4. Create/Update Payslip
                const payslipData = {
                    employee: employee._id,
                    month: run.month,
                    year: run.year,
                    basicSalary: Math.round(payrollData.basicSalary),
                    grossSalary: Math.round(finalGross),
                    totalDeductions: Math.round(finalDeductions),
                    netSalary: Math.round(finalNet),
                    earnings: payrollData.earnings.map(e => ({
                        type: e.name,
                        amount: Math.round(e.calculatedAmount),
                        calculationType: e.calculationType || 'fixed',
                        percentage: e.percentage || 0
                    })),
                    deductions: payrollData.deductions.map(d => ({
                        type: d.name,
                        amount: Math.round(d.calculatedAmount),
                        calculationType: d.calculationType || 'fixed',
                        percentage: d.percentage || 0
                    })),
                    workingDays: daysInMonth,
                    presentDays: daysInMonth - lopDays,
                    lopDays: lopDays,
                    status: 'Draft',
                    organizationName: employee.jobDetails?.organizationId?.name || "N/A",
                    salaryType: payrollData.salaryType,
                    generatedBy: performedBy
                };

                // Add additional retro entries if any
                if (retros.length > 0) {
                    retros.forEach(r => {
                        if (r.type === 'Earning') {
                            payslipData.earnings.push({ type: r.componentName + " (Retro)", amount: r.amount });
                        } else {
                            payslipData.deductions.push({ type: r.componentName + " (Retro)", amount: r.amount });
                        }
                    });
                }

                // Add Variable Pay entries
                if (variableInputs.length > 0) {
                    variableInputs.forEach(v => {
                        const name = componentMap[v.componentId.toString()] || "Variable Pay";
                        payslipData.earnings.push({
                            type: name,
                            amount: Math.round(v.payoutAmount),
                            calculationType: 'performance_linked',
                            percentage: v.achievementPercentage
                        });
                    });
                }

                // Upsert Payslip
                const existingPayslip = await Payslip.findOne({ employee: employee._id, month: run.month, year: run.year });
                if (existingPayslip) {
                    await Payslip.findByIdAndUpdate(existingPayslip._id, payslipData);
                } else {
                    const count = await Payslip.countDocuments();
                    payslipData.payslipId = `PSL${String(count + 1).padStart(6, "0")}`;
                    await Payslip.create(payslipData);
                }

                // 5. Update Retros to 'Applied'
                if (retros.length > 0) {
                    await RetroAdjustment.updateMany(
                        { _id: { $in: retros.map(r => r._id) } },
                        { status: 'Applied', appliedInMonth: run.month, appliedInYear: run.year }
                    );
                }

                totalGross += finalGross;
                totalDeductions += finalDeductions;
                totalNet += finalNet;
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

        run.status = 'Completed';
        run.totalEmployees = employees.length;
        run.processedEmployees = processedCount;
        run.failedEmployeesCount = failedCount;
        run.totalGrossSalary = Math.round(totalGross);
        run.totalDeductions = Math.round(totalDeductions);
        run.totalNetSalary = Math.round(totalNet);
        run.logs.push({ message: `Processing finished. ${processedCount} succeeded, ${failedCount} failed.`, level: 'info' });

        await run.save();

        return NextResponse.json({
            message: "Batch processing completed",
            processedCount,
            failedCount,
            totals: { totalGross, totalDeductions, totalNet }
        });

    } catch (error) {
        console.error("Batch Processor Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
