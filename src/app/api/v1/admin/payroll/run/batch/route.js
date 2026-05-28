import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Payslip from "@/lib/db/models/payroll/Payslip";
import Employee from "@/lib/db/models/payroll/Employee";
import PayrollRun from "@/lib/db/models/payroll/PayrollRun";
import StatutoryConfig from "@/lib/db/models/payroll/StatutoryConfig";
import mongoose from "mongoose";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";
import RetroAdjustment from "@/lib/db/models/payroll/RetroAdjustment";
import VariablePayConfig from "@/lib/db/models/payroll/VariablePayConfig";
import PayrollVariableInput from "@/lib/db/models/payroll/PayrollVariableInput";
import Attendance from "@/lib/db/models/payroll/Attendance";
import Leave from "@/lib/db/models/payroll/Leave";

export async function POST(request) {
  let payrollRun = null;
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

    if (!orgId || orgId === "undefined" || orgId === "null") {
      const Organization = mongoose.models.Organization || mongoose.model('Organization', new mongoose.Schema({}));
      const firstOrg = await Organization.findOne({});
      if (firstOrg) orgId = firstOrg._id.toString();
    }

    if (!month || !year || !orgId) {
      return NextResponse.json({ error: "Missing required fields (month, year, orgId)" }, { status: 400 });
    }

    // --- FUTURE DATE PROTECTION --- //
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return NextResponse.json({ 
        error: "Cannot run payroll for future months. Please select the current or a previous month." 
      }, { status: 400 });
    }
    // 1. Check if a Payroll Run already exists for this Org + Month + Year
    const existingRun = await PayrollRun.findOne({ month, year, organizationId: orgId });
    if (existingRun) {
      return NextResponse.json(
        { 
          error: "A Payroll Run already exists for this period.", 
          existingRunId: existingRun._id 
        },
        { status: 409 }
      );
    }

    // 2. Fetch all Active & Compliant employees for this Organization
    const employees = await Employee.find({
      "jobDetails.organizationId": orgId,
      status: "Active"
    })
    .populate("jobDetails.departmentId")
    .lean();

    if (employees.length === 0) {
      return NextResponse.json({ error: "No active employees found for this organization." }, { status: 404 });
    }

    // 2.5 Filter out employees who already have a Payslip for this month/year
    const existingPayslips = await Payslip.find({ month, year, organizationId: orgId }).select('employee');
    const existingEmpIds = existingPayslips.map(p => p.employee.toString());
    
    const eligibleEmployees = employees.filter(emp => !existingEmpIds.includes(emp._id.toString()));

    if (eligibleEmployees.length === 0) {
      return NextResponse.json({ 
        error: "All active employees already have payslips generated for this period." 
      }, { status: 409 });
    }

    // 3. Create the Master PayrollRun Document (Draft state)
    const runId = `PRUN-${year}${String(month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    payrollRun = await PayrollRun.create({
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

    // 4. Loop through each eligible employee and generate a Draft Payslip
    for (const empData of eligibleEmployees) {
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
          earnings: salaryCalc.earnings.map(e => ({
            type: e.name,
            amount: e.calculatedAmount,
            percentage: e.percentage || 0,
            calculationType: e.calculationType || "percentage"
          })),
          deductions: salaryCalc.deductions.map(d => ({
            type: d.name,
            amount: d.calculatedAmount,
            percentage: d.percentage || 0,
            calculationType: d.calculationType || "percentage"
          })),
          leaveDays: salaryCalc.paidLeaves + salaryCalc.lopDays,
          paidLeaveDays: salaryCalc.paidLeaves || 0,
          unpaidLeaveDays: salaryCalc.lopDays || 0,
          totalDays: salaryCalc.totalDays || totalDays,
          weeklyOffs: salaryCalc.weeklyOffs || 0,
          halfDays: salaryCalc.halfDays || 0,
          holidays: salaryCalc.holidays || 0,
          workingDays: salaryCalc.workingDays || 0,
          presentDays: salaryCalc.presentDays || 0,
          paidDays: salaryCalc.paidDays || 0,
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
      
      // Update Retro Adjustments to 'Applied' for all processed employees in this run
      await RetroAdjustment.updateMany(
        { 
          employeeId: { $in: generatedPayslips.map(p => p.employee) },
          status: 'Pending'
        },
        { 
          status: 'Applied', 
          appliedInMonth: month, 
          appliedInYear: year 
        }
      );

      // Update Payroll Run aggregate metrics
      payrollRun.totalGrossSalary = totalGross;
      payrollRun.totalNetSalary = totalNet;
      payrollRun.totalDeductions = totalDeductions;
      payrollRun.totalEmployees = generatedPayslips.length;
      payrollRun.processedEmployees = generatedPayslips.length;
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
    if (payrollRun && payrollRun._id) {
      try {
        const PayrollRunModel = mongoose.models.PayrollRun || mongoose.model("PayrollRun");
        await PayrollRunModel.findByIdAndDelete(payrollRun._id);
      } catch (cleanupErr) {
        console.error("Failed to cleanup empty PayrollRun:", cleanupErr);
      }
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
