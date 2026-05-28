import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Payslip from "@/lib/db/models/payroll/Payslip";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    let filter = {};

    if (authUser.role !== "super_admin") {
      if (authUser.role === "employee") {
        filter.employee = authUser.id;
      } else {
        filter.organizationId = authUser.organizationId;
      }
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employeeId) filter.employee = employeeId;

    const payslips = await Payslip.find(filter)
      .populate("employee", "employeeId personalDetails.firstName personalDetails.lastName jobDetails.department")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, payslips });
  } catch (error) {
    console.error("GET PAYSLIPS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    await dbConnect();

    const body = await request.json();
    const { 
      employee, 
      month, 
      year, 
      basicSalary, 
      earnings, 
      deductions, 
      grossSalary, 
      totalDeductions, 
      netSalary, 
      workingDays, 
      presentDays, 
      leaveDays, 
      paidLeaveDays, 
      unpaidLeaveDays, 
      overtimeHours, 
      overtimeAmount, 
      notes, 
      organizationName, 
      salaryType 
    } = body;

    // We can also allow 'employeeId' for backward compatibility
    const empId = employee || body.employeeId;

    if (!empId || !month || !year || basicSalary === undefined || grossSalary === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // --- FUTURE DATE PROTECTION --- //
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot generate payslip for future months." 
      }, { status: 400 });
    }

    // Pre-process earnings and deductions to match schema (e.g. name -> type if needed)
    const formattedEarnings = (earnings || []).map(e => ({
      type: e.type || e.name || 'Other',
      amount: e.amount || 0,
      percentage: e.percentage || 0,
      calculationType: e.calculationType || 'percentage'
    }));

    const formattedDeductions = (deductions || []).map(d => ({
      type: d.type || d.name || 'Other',
      amount: d.amount || 0,
      percentage: d.percentage || 0,
      calculationType: d.calculationType || 'percentage'
    }));

    // Check for existing payslip
    const existing = await Payslip.findOne({
      employee: empId,
      month,
      year,
      status: { $ne: "Cancelled" },
    });

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: "DUPLICATE_PAYSLIP", 
        message: "Payslip already exists for this period",
        existingPayslipId: existing._id
      }, { status: 400 });
    }

    const employeeRecord = await Employee.findById(empId);
    if (!employeeRecord) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    // Verify organization name is provided; if not, fetch from employee or auth user
    let orgName = organizationName || employeeRecord.jobDetails?.organization;
    let orgId = employeeRecord.jobDetails?.organizationId || authUser.organizationId;

    if (!orgName && employeeRecord.jobDetails?.organizationId?.name) {
      orgName = employeeRecord.jobDetails?.organizationId?.name;
    }
    if (!orgName) orgName = "Unknown Organization";
    
    // Prepare payslip data
    const payslipData = {
      employee: empId,
      month,
      year,
      basicSalary,
      earnings: formattedEarnings,
      deductions: formattedDeductions,
      grossSalary,
      totalDeductions,
      netSalary,
      workingDays: workingDays || 30,
      presentDays: presentDays || 30,
      leaveDays: leaveDays || 0,
      paidLeaveDays: paidLeaveDays || 0,
      unpaidLeaveDays: unpaidLeaveDays || 0,
      overtimeHours: overtimeHours || 0,
      overtimeAmount: overtimeAmount || 0,
      status: "Generated",
      notes: notes || "",
      organizationId: orgId,
      organizationName: orgName,
      salaryType: salaryType || employeeRecord.payslipStructure?.salaryType || "monthly",
      generatedBy: authUser.id,
      payslipId: `PSL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    const payslip = await Payslip.create(payslipData);
    return NextResponse.json({ success: true, payslip }, { status: 201 });
  } catch (error) {
    console.error("POST PAYSLIPS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
