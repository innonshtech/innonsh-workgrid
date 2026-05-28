import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Payslip from "@/lib/db/models/payroll/Payslip";
import Employee from "@/lib/db/models/payroll/Employee";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

// GET all payslips
export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const employee = searchParams.get("employee");
    const skip = (page - 1) * limit;

    let filter = {};

    // SaaS PROTECTION: Restrict data by organization
    if (authUser.role === "admin" || authUser.role === "supervisor") {
      filter.organizationId = authUser.organizationId;
    } else if (authUser.role === "employee") {
      filter.employee = authUser.id;
      // Keka Parity: Employees only see Published payslips
      if (!status) filter.status = "Published"; 
    } else if (authUser.role === "super_admin" && (employeeId || employee)) {
       filter.employee = employeeId || employee;
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;
    if (employeeId && authUser.role !== "employee") filter.employee = employeeId;
    if (employee && authUser.role !== "employee") filter.employee = employee;

    const payslips = await Payslip.find(filter)
      .populate("employee", "employeeId personalDetails.firstName personalDetails.lastName jobDetails.department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Payslips fetched:", payslips.length);

    const total = await Payslip.countDocuments(filter);

    return NextResponse.json({
      payslips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payslips:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to check for duplicate payslip
export async function GET_CHECK(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const employee = searchParams.get("employee");
    const month = parseInt(searchParams.get("month"));
    const year = parseInt(searchParams.get("year"));

    if (!employee || !month || !year) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const existingPayslip = await Payslip.findOne({
      employee,
      month,
      year,
      status: { $ne: "Cancelled" },
    }).populate("employee", "employeeId personalDetails.firstName personalDetails.lastName");

    return NextResponse.json({
      exists: !!existingPayslip,
      payslip: existingPayslip,
    });
  } catch (error) {
    console.error("Error checking payslip:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// CREATE new payslip
export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);

    await dbConnect();

    const body = await request.json();

    // Validate required fields
    if (!body.employee || !body.month || !body.year || !body.organizationName || !body.salaryType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for existing payslip
    const existingPayslip = await Payslip.findOne({
      employee: body.employee,
      month: body.month,
      year: body.year,
      status: { $ne: "Cancelled" },
    });

    if (existingPayslip) {
      return NextResponse.json(
        {
          error: "DUPLICATE_PAYSLIP",
          message: `A payslip for ${getMonthName(body.month)} ${body.year} already exists for this employee.`,
          existingPayslipId: existingPayslip._id,
        },
        { status: 409 }
      );
    }

    // Fetch employee data to validate ownership and get type
    const employeeRecord = await Employee.findById(body.employee);
    if (!employeeRecord) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    
    // SaaS PROTECTION: Admin must use their assigned organizationId
    const targetOrgId = authUser.role === "admin" ? authUser.organizationId : body.organizationId;

    if (authUser.role === "admin" && employeeRecord.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
       return NextResponse.json({ error: "Forbidden: Employee belongs to another organization" }, { status: 403 });
    }

    const employeeType = employeeRecord.employeeType || null;

    // Generate unique payslip ID without race conditions
    const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const payslipId = `PSL-${uniqueSuffix}`;

    if (!targetOrgId) {
       return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const payslip = await Payslip.create({
      ...body,
      organizationId: targetOrgId,
      generatedBy: authUser.id,
      payslipId,
      employeeType,
    });

    await payslip.populate("employee", "employeeId personalDetails.firstName personalDetails.lastName jobDetails.department");

    // Log activity
    await logActivity({
      action: "generated",
      entity: "Payslip",
      entityId: payslip.payslipId,
      description: `Generated payslip for ${payslip.employee?.personalDetails?.firstName} ${payslip.employee?.personalDetails?.lastName} (${getMonthName(body.month)} ${body.year})`,
      performedBy: {
        userId: body.generatedBy,
        name: "Admin/User"
      },
      details: {
        employeeId: body.employee,
        month: body.month,
        year: body.year,
        netSalary: payslip.netSalary
      },
      req: request
    });

    return NextResponse.json(payslip, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error: "DUPLICATE_PAYSLIP",
          message: "A payslip for this employee and period already exists.",
        },
        { status: 409 }
      );
    }
    console.error("Error creating payslip:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to get month name
function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}