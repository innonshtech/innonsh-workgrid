import dbConnect from "@/lib/db/connect";
import FnFSettlement from "@/lib/db/models/FnFSettlement";
import ExitRequest from "@/lib/db/models/ExitRequest";
import Employee from "@/lib/db/models/payroll/Employee";
import Leave from "@/lib/db/models/payroll/Leave";
import {
    calculatePerDaySalary,
    calculateGratuityAmount,
    calculateLeaveEncashment,
    calculateNoticeRecovery,
    calculateProratedEarnings
} from "@/lib/utils/fnfCalculations";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        await dbConnect();
        const body = await request.json();
        const { exitRequestId, action } = body;

        if (!exitRequestId) {
            return NextResponse.json({ error: "Exit Request ID is required" }, { status: 400 });
        }

        const exitRequest = await ExitRequest.findById(exitRequestId).populate("employee");
        if (!exitRequest) {
            return NextResponse.json({ error: "Exit Request not found" }, { status: 404 });
        }

        const employee = await Employee.findById(exitRequest.employee._id);
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // SaaS PROTECTION: Admin restricted to their org
        if (authUser.role === "admin") {
            const empOrgId = employee.jobDetails?.organizationId?.toString();
            if (empOrgId !== authUser.organizationId) {
                return NextResponse.json({ error: "Forbidden: Not your organization" }, { status: 403 });
            }
        }

        // Check if FnF already exists
        let fnf = await FnFSettlement.findOne({ exitRequest: exitRequestId });

        if (action === "calculate" || !fnf) {
            // --- CALCULATION LOGIC ---

            // 1. Basic Dates & Tenure
            const joiningDate = new Date(employee.personalDetails.dateOfJoining);
            const lastWorkingDate = new Date(exitRequest.lastWorkingDate);
            const tenureYears = (lastWorkingDate - joiningDate) / (1000 * 60 * 60 * 24 * 365.25);

            // 2. Salary Structure Snapshot
            const salaryStructure = employee.payslipStructure || {};
            const basicSalary = salaryStructure.basicSalary || 0;
            const grossSalary = salaryStructure.grossSalary || 0;

            // 3. Leave Balance (Fetch latest year record)
            const currentYear = lastWorkingDate.getFullYear();
            const leaveRecord = await Leave.findOne({
                employeeId: employee._id,
                year: currentYear
            }).sort({ month: -1 }); // Get latest month record

            const leaveBalance = leaveRecord?.annualLeaveBalance?.remaining || 0;

            // 4. Calculations
            // const { encashmentRate, noticeRecoveryRate } = calculatePerDaySalary(salaryStructure);

            // Leave Encashment
            const leaveEncashmentAmount = calculateLeaveEncashment(leaveBalance, basicSalary);

            // Gratuity
            const gratuityAmount = employee.gratuityApplicable === 'yes' ? calculateGratuityAmount(basicSalary, tenureYears) : 0;

            // Notice Period Recovery (Simplified logic - assume 0 shortfall unless provided/calculated)
            // In a real scenario, we'd compare required vs served notice. 
            // For now, let's placeholder or use passed values if any.
            const noticeShortfallDays = body.noticeShortfallDays || 0;
            const noticeRecoveryAmount = calculateNoticeRecovery(noticeShortfallDays, grossSalary);

            // Prorated Salary for Exit Month
            const exitMonth = lastWorkingDate.getMonth() + 1; // 1-12
            const daysInMonth = new Date(currentYear, exitMonth, 0).getDate();
            const daysWorked = body.daysWorked || lastWorkingDate.getDate(); // Default to date of exit


            // We need a robust proration if we are doing full salary calculation here.
            // For simplicity in this "Start", we might skip detailed earning component breakdown 
            // and just do Gross Proration or Basic Proration + Leave + Gratuity

            // Let's use a simple Gross Proration for now to populate the "Earnings" total
            const proratedSalary = Math.round((grossSalary / daysInMonth) * daysWorked);


            // Construct/Update FnF Object
            const fnfData = {
                employee: employee._id,
                exitRequest: exitRequest._id,
                resignationDate: exitRequest.resignationDate,
                lastWorkingDate: exitRequest.lastWorkingDate,
                salaryMonth: { month: exitMonth, year: currentYear },
                daysWorked,
                totalDaysInMonth: daysInMonth,
                salaryDetailsSnapshot: {
                    basicSalary,
                    grossSalary,
                    salaryType: salaryStructure.salaryType
                },
                earnings: {
                    totalEarnings: proratedSalary, // Simplified
                    basic: Math.round((basicSalary / daysInMonth) * daysWorked)
                },
                leaveEncashment: {
                    eligibleDays: leaveBalance,
                    amount: leaveEncashmentAmount,
                    formula: "(Basic / 26) * Balance"
                },
                gratuity: {
                    isApplicable: employee.gratuityApplicable === 'yes',
                    tenureYears: parseFloat(tenureYears.toFixed(2)),
                    amount: gratuityAmount
                },
                noticePeriod: {
                    shortfallDays: noticeShortfallDays,
                    recoveryAmount: noticeRecoveryAmount
                },
                grossPayable: proratedSalary + leaveEncashmentAmount + gratuityAmount,
                totalRecoveries: noticeRecoveryAmount,
                netPayable: (proratedSalary + leaveEncashmentAmount + gratuityAmount) - noticeRecoveryAmount,
                status: "Draft"
            };

            if (fnf) {
                fnf = await FnFSettlement.findByIdAndUpdate(fnf._id, fnfData, { new: true });
            } else {
                fnf = await FnFSettlement.create(fnfData);
            }
        }

        return NextResponse.json(fnf);

    } catch (error) {
        console.error("FnF Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const exitRequestId = searchParams.get("exitRequestId");
        const employeeId = searchParams.get("employeeId");

        let query = {};
        if (exitRequestId) query.exitRequest = exitRequestId;
        if (employeeId) query.employee = employeeId;

        if (Object.keys(query).length === 0) {
            return NextResponse.json({ error: "Provide exitRequestId or employeeId" }, { status: 400 });
        }

        const fnf = await FnFSettlement.findOne(query)
            .populate("employee", "personalDetails.firstName personalDetails.lastName")
            .populate("exitRequest");

        return NextResponse.json(fnf || null);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
