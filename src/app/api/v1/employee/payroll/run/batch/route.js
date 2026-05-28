import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Payslip from "@/lib/db/models/payroll/Payslip";
import Employee from "@/lib/db/models/payroll/Employee";
import PayrollRun from "@/lib/db/models/payroll/PayrollRun";
import StatutoryConfig from "@/lib/db/models/payroll/StatutoryConfig";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);

    await dbConnect();
    const body = await request.json();
    let { month, year, orgId } = body;

    // SaaS PROTECTION: Admin must use their assigned organizationId
    if (authUser.role === "admin") {
      orgId = authUser.organizationId;
    }

    if (!month || !year || !orgId) {
      return NextResponse.json({ error: "Missing required fields (month, year, orgId)" }, { status: 400 });
    }

    // 1. Check if a Payroll Run already exists for this Org + Month + Year
    const existingRun = await PayrollRun.findOne({ month, year, organizationId: orgId });
    if (existingRun) {
      return NextResponse.json(
        { error: "A Payroll Run already exists for this period. Please delete it first if you want to regenerate." },
        { status: 409 }
      );
    }

    // 2. Fetch all Active & Compliant employees for this Organization
    const employees = await Employee.find({
      "jobDetails.organizationId": orgId,
      status: "Active"
    })
    .populate("jobDetails.departmentId")
    .lean(); // Use lean for performance, we'll instantiate Mongoose models if needed for methods

    if (employees.length === 0) {
      return NextResponse.json({ error: "No active employees found for this organization." }, { status: 404 });
    }

    // 3. Create the Master PayrollRun Document (Draft state)
    const runId = `PRUN-${year}${String(month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payrollRun = await PayrollRun.create({
      runId,
      month,
      year,
      organizationId: orgId,
      generatedBy: authUser.id,
      status: 'Draft',
      periodStart: new Date(year, month - 1, 1),
      periodEnd: new Date(year, month, 0)
    });

    const generatedPayslips = [];
    const errors = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    // Cache statutory config to avoid repeated DB calls
    const stateConfigs = {};

    // 4. Loop through each employee and generate a Draft Payslip
    for (const empData of employees) {
      try {
        // Instantiate Mongoose Document to use `calculateSalaryComponents` method
        const employeeDoc = await Employee.findById(empData._id);
        
        if (!employeeDoc.payslipStructure || !employeeDoc.payslipStructure.basicSalary) {
           errors.push({ employeeId: empData.employeeId, error: "Missing salary structure" });
           continue;
        }

        // Fetch Statutory Config for Employee's State if not cached
        const workState = employeeDoc.jobDetails?.workState || 'Maharashtra';
        if (!stateConfigs[workState]) {
           const config = await StatutoryConfig.findOne({ state: { $regex: new RegExp(`^${workState}$`, 'i') } });
           stateConfigs[workState] = config;
        }

        // --- ATTENDANCE, LEAVE & LOAN INTEGRATION --- //
        // Now automatically handled by the async calculateSalaryComponents method
        const totalDays = new Date(year, month, 0).getDate();

        // --- CALCULATE COMPONENTS (Async) --- //
        const salaryCalc = await employeeDoc.calculateSalaryComponents(stateConfigs[workState], {
            workingDaysInMonth: totalDays,
            month: month,
            year: year
        });

        const grossSalary = salaryCalc.totalEarnings;
        const netSalary = salaryCalc.netSalary;

        totalGross += grossSalary;
        totalNet += netSalary;
        totalDeductions += salaryCalc.totalDeductions;

        // Generate unique payslip ID
        const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const payslipId = `PSL-${uniqueSuffix}`;

        // Create Payload
        generatedPayslips.push({
          payslipId,
          payrollRunId: payrollRun._id, // LINK TO BATCH RUN
          employee: employeeDoc._id,
          employeeType: employeeDoc.jobDetails?.employeeType || null,
          organizationId: orgId,
          organizationName: employeeDoc.jobDetails?.organization || "Organization",
          month,
          year,
          status: "Draft",
          salaryType: salaryCalc.salaryType || "monthly",
          basicSalary: salaryCalc.basicSalary,
          earnings: salaryCalc.earnings,
          deductions: salaryCalc.deductions,
          totalDays: totalDays,
          presentDays: totalDays - (salaryCalc.lopDays || 0),
          leaveDays: salaryCalc.lopDays || 0,
          paidLeaveDays: 0, // Should be fetched if needed separately, but LOP is key for deduction
          unpaidLeaveDays: salaryCalc.lopDays || 0,
          overtimeHours: salaryCalc.overtimeHours || 0,
          overtimeRate: employeeDoc.salaryDetails?.overtimeRate || 0,
          overtimeAmount: salaryCalc.overtimeAmount || 0,
          loanDeductions: salaryCalc.loanDeductions || 0,
          ctcGrossSalary: employeeDoc.payslipStructure.grossSalary, // Reference field
          grossSalary: grossSalary,
          totalDeductions: salaryCalc.totalDeductions,
          netSalary: netSalary,
          generatedBy: authUser.id,
          paymentMethod: employeeDoc.salaryDetails?.bankAccount?.accountNumber ? "Bank Transfer" : "Manual",
          paymentDetails: employeeDoc.salaryDetails?.bankAccount || {}
        });

      } catch (empError) {
        console.error(`Error processing employee ${empData.employeeId}: `, empError);
        errors.push({ employeeId: empData.employeeId, error: empError.message });
      }
    }

    // 5. Bulk Insert Payslips
    if (generatedPayslips.length > 0) {
      await Payslip.insertMany(generatedPayslips);
      
      // Update Payroll Run aggregate metrics
      payrollRun.totalGrossSalary = totalGross;
      payrollRun.totalNetSalary = totalNet;
      payrollRun.totalDeductions = totalDeductions;
      payrollRun.employeesProcessed = generatedPayslips.length;
      await payrollRun.save();
    } else {
      // If none generated successfully, remove the draft run
      await PayrollRun.findByIdAndDelete(payrollRun._id);
      return NextResponse.json({ error: "Failed to generate any payslips. Ensure employees have salary structures." }, { status: 400 });
    }

    // 6. Log completion
    await logActivity({
      action: "batch_generated",
      entity: "PayrollRun",
      entityId: payrollRun.runId,
      description: `Batch generated ${generatedPayslips.length} payslips for ${month}/${year}`,
      performedBy: { userId: authUser.id, name: authUser.name },
      req: request
    });

    return NextResponse.json({
        message: `Successfully generated ${generatedPayslips.length} draft payslips.`,
        runId: payrollRun._id,
        employeesProcessed: generatedPayslips.length,
        errors: errors.length > 0 ? errors : undefined
    }, { status: 201 });

  } catch (error) {
    console.error("Batch Payroll Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
