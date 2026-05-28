
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import Payslip from '@/lib/db/models/payroll/Payslip';
import Employee from '@/lib/db/models/payroll/Employee';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const runId1 = searchParams.get('runId1');
        const runId2 = searchParams.get('runId2');

        if (!runId1 || !runId2) {
            return NextResponse.json({ error: "Missing runId1 or runId2" }, { status: 400 });
        }

        // 1. Fetch Payroll Runs
        const [run1, run2] = await Promise.all([
            PayrollRun.findOne({ _id: runId1 }).lean(),
            PayrollRun.findOne({ _id: runId2 }).lean()
        ]);

        if (!run1 || !run2) {
            return NextResponse.json({ error: "One or both payroll runs not found" }, { status: 404 });
        }

        // 2. Fetch Payslips
        // We fetch basic salary, net salary, gross salary, and employee details
        const [payslips1, payslips2] = await Promise.all([
            Payslip.find({ month: run1.month, year: run1.year })
                .populate('employee', 'personalDetails.firstName personalDetails.lastName personalDetails.email jobDetails.department jobDetails.designation jobDetails.employeeType')
                .lean(),
            Payslip.find({ month: run2.month, year: run2.year })
                .populate('employee', 'personalDetails.firstName personalDetails.lastName personalDetails.email jobDetails.department jobDetails.designation jobDetails.employeeType')
                .lean()
        ]);

        // 3. High Level Variance
        const highLevelVariance = {
            run1: {
                period: `${run1.month}/${run1.year}`,
                gross: run1.totalGrossSalary,
                net: run1.totalNetSalary,
                employees: run1.processedEmployees
            },
            run2: {
                period: `${run2.month}/${run2.year}`,
                gross: run2.totalGrossSalary,
                net: run2.totalNetSalary,
                employees: run2.processedEmployees
            },
            variance: {
                gross: run2.totalGrossSalary - run1.totalGrossSalary,
                net: run2.totalNetSalary - run1.totalNetSalary,
                employees: run2.processedEmployees - run1.processedEmployees
            },
            variancePercentage: {
                gross: run1.totalGrossSalary ? ((run2.totalGrossSalary - run1.totalGrossSalary) / run1.totalGrossSalary) * 100 : 0,
                net: run1.totalNetSalary ? ((run2.totalNetSalary - run1.totalNetSalary) / run1.totalNetSalary) * 100 : 0
            }
        };

        // 4. Employee Level Variance
        const employees1Map = new Map(payslips1.map(p => [String(p.employee._id), p]));
        const employees2Map = new Map(payslips2.map(p => [String(p.employee._id), p]));

        const allEmployeeIds = new Set([...employees1Map.keys(), ...employees2Map.keys()]);

        const employeeVariances = [];
        const newJoiners = [];
        const exits = [];
        const salaryChanges = [];

        for (const empId of allEmployeeIds) {
            const p1 = employees1Map.get(empId);
            const p2 = employees2Map.get(empId);

            if (p1 && !p2) {
                // Exit (Processed in Run 1 but not Run 2)
                exits.push({
                    id: empId,
                    name: `${p1.employee.personalDetails.firstName} ${p1.employee.personalDetails.lastName}`,
                    department: p1.employee.jobDetails.department,
                    lastNetSalary: p1.netSalary
                });
            } else if (!p1 && p2) {
                // New Joiner (Processed in Run 2 but not Run 1)
                newJoiners.push({
                    id: empId,
                    name: `${p2.employee.personalDetails.firstName} ${p2.employee.personalDetails.lastName}`,
                    department: p2.employee.jobDetails.department,
                    currentNetSalary: p2.netSalary
                });
            } else if (p1 && p2) {
                // Present in both, check for variance
                const netVariance = p2.netSalary - p1.netSalary;
                const grossVariance = p2.grossSalary - p1.grossSalary;

                if (Math.abs(netVariance) > 0 || Math.abs(grossVariance) > 0) {
                    salaryChanges.push({
                        id: empId,
                        name: `${p2.employee.personalDetails.firstName} ${p2.employee.personalDetails.lastName}`,
                        department: p2.employee.jobDetails.department,
                        designation: p2.employee.jobDetails.designation,
                        previousNet: p1.netSalary,
                        currentNet: p2.netSalary,
                        netVariance,
                        previousGross: p1.grossSalary,
                        currentGross: p2.grossSalary,
                        grossVariance,
                        reason: detectReason(p1, p2)
                    });
                }
            }
        }

        return NextResponse.json({
            meta: {
                run1: { id: run1._id, label: `${run1.month}/${run1.year}` },
                run2: { id: run2._id, label: `${run2.month}/${run2.year}` }
            },
            summary: highLevelVariance,
            details: {
                newJoiners,
                exits,
                salaryChanges,
                totalChanges: salaryChanges.length
            }
        });

    } catch (error) {
        console.error("Comparison Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function detectReason(p1, p2) {
    const reasons = [];
    if (p2.basicSalary !== p1.basicSalary) reasons.push("Basic Change");

    // Check Leave Deduction
    const p1Lop = p1.leaveDetails?.leaveDeduction || 0;
    const p2Lop = p2.leaveDetails?.leaveDeduction || 0;
    if (p2Lop !== p1Lop) reasons.push(`LOP Variance (${p2Lop - p1Lop})`);

    // Check Variable Pay (Incentives/Bonuses) if modeled in earnings
    // Simplified check:
    if (p2.grossSalary > p1.grossSalary && p2.basicSalary === p1.basicSalary) reasons.push("Earnings Increased");
    if (p2.grossSalary < p1.grossSalary && p2.basicSalary === p1.basicSalary && p2Lop === p1Lop) reasons.push("Earnings Decreased");

    return reasons.join(", ") || "Other Adjustment";
}
