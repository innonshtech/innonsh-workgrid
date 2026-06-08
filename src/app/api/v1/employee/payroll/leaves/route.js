// src/app/api/payroll/leaves/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Leave from "@/lib/db/models/payroll/Leave";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

// GET all leaves with filters
export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const organizationId = searchParams.get("organizationId");
    const organizationType = searchParams.get("organizationType");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const search = searchParams.get("search");
    const supervisorUserId = searchParams.get("supervisorUserId");

    const skip = (page - 1) * limit;

    let filter = {};

    // SaaS PROTECTION: Restrict by organization
    if (authUser.role === "admin" || authUser.role === "supervisor") {
        const orgEmployees = await Employee.find({ 
            "jobDetails.organizationId": authUser.organizationId 
        }).distinct("_id");
        filter.employeeId = { $in: orgEmployees };
    } else if (authUser.role === "employee") {
        filter.employeeId = authUser.id;
    }

    let supervisorFilter = {};
    if (supervisorUserId && supervisorUserId !== 'undefined') {
       let supervisorEmployeeId = null;
        try {
           const supervisorUser = await User.findById(supervisorUserId);
           if (supervisorUser?.employeeId) {
               supervisorEmployeeId = supervisorUser.employeeId;
           }
        } catch (e) {}

        let supervisorEmployee;
        if (supervisorEmployeeId) {
             supervisorEmployee = await Employee.findOne({ employeeId: supervisorEmployeeId });
        } else {
             try {
                supervisorEmployee = await Employee.findById(supervisorUserId);
             } catch(e) {}
        }

        if (supervisorEmployee) {
           const supervisees = await Employee.find({
               $or: [
                   { "jobDetails.reportingManager": supervisorEmployee._id },
                   { "attendanceApproval.shift1Supervisor": supervisorEmployee._id },
                   { "attendanceApproval.shift2Supervisor": supervisorEmployee._id }
               ]
           }).distinct('_id');
           
           if (supervisees.length > 0) {
               supervisorFilter = { employeeId: { $in: supervisees } };
           } else {
               supervisorFilter = { employeeId: { $in: [] } };
           }
        } else {
            supervisorFilter = { employeeId: { $in: [] } };
        }
    }

    if (employeeId) {
        // If employeeId is requested, ensure it is within the supervisor's allowed list
        filter.employeeId = employeeId;
        if (supervisorUserId) {
             // Combine filters
             if (supervisorFilter.employeeId && supervisorFilter.employeeId.$in) {
                 // Check if requested employeeId is in supervisor's list
                 const allowed = supervisorFilter.employeeId.$in;
                 // Assuming employeeId is string/ObjectId, check appropriately. 
                 // supervisees are ObjectIds. employeeId param might be string.
                 const isAllowed = allowed.some(id => id.toString() === employeeId);
                 if (!isAllowed) {
                     filter.employeeId = { $in: [] }; // Force empty result
                 }
             } else {
                 // Supervisor has 0 supervisees
                  filter.employeeId = { $in: [] };
             }
        }
    } else if (supervisorUserId) {
        // Apply supervisor filter directly
        Object.assign(filter, supervisorFilter);
    }

    // Filter by organization ID
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    // Filter by organization type
    if (organizationType) {
      filter.organizationType = organizationType;
    }

    // Filter by month
    if (month) {
      filter.month = parseInt(month);
    }

    // Filter by year
    if (year) {
      filter.year = parseInt(year);
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }



    // Search by employee name or code
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
      ];
    }

    const leaves = await Leave.find(filter)
      .populate("employeeId", "personalDetails employeeId status")
      .populate("organizationId", "name")
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Leave.countDocuments(filter);

    return NextResponse.json({
      leaves,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/payroll/leaves:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// CREATE or UPDATE leave record
export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);
    
    await dbConnect();

    const body = await request.json();
    console.log("Leave Request Body:", body);

    const {
      employeeId,
      month,
      year,
      leaves,
      notes,
      status = "Draft",
    } = body;

    // Validate required fields
    if (!employeeId || !month || !year) {
      return NextResponse.json(
        { error: "Employee ID, month, and year are required" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("Employee found:", {
      id: employee._id,
      name: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      organizationType: employee.organizationType,
      organizationId: employee.jobDetails?.organizationId,
      department: employee.jobDetails?.department,
    });
    
    // SaaS PROTECTION: Admin must use their assigned organizationId or edit users within their org
    if (authUser.role === "admin") {
      const empOrgId = employee.jobDetails?.organizationId?.toString();
      if (empOrgId !== authUser.organizationId) {
        return NextResponse.json({ error: "Forbidden: Cannot apply leave for employee in another organization" }, { status: 403 });
      }
    }

    // Check if leave record already exists for this month
    let leaveRecord = await Leave.findOne({
      employeeId,
      month: parseInt(month),
      year: parseInt(year),
    });

    // Prepare leave data
    const leaveData = {
      employeeId,
      employeeCode: employee.employeeId,
      employeeName: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      organizationId: employee.jobDetails?.organizationId || null,
      organizationType: employee.organizationType || "Unknown",
      department: employee.jobDetails?.departmentId?.toString() || "Unknown",
      month: parseInt(month),
      year: parseInt(year),
      leaves: leaves || [],
      notes: notes || "",
      status,
    };

    if (leaveRecord) {
      // Record exists - this should ONLY happen in edit mode
      // But if user is creating and a record exists, we have a conflict
      console.log("⚠️ WARNING: Record already exists for this employee/month/year!");
      console.log(`   Existing record ID: ${leaveRecord._id}`);
      console.log(`   This should be handled via PUT (edit), not POST (create)`);
      
      return NextResponse.json(
        { 
          error: "A leave record already exists for this employee in this month. Please use the edit function to modify it.",
          existingRecordId: leaveRecord._id
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create new record (no existing record found)
    console.log("📝 Creating new leave record...");
    
    leaveRecord = await Leave.create({
      ...leaveData,
      createdBy: body.createdBy,
      updatedBy: body.updatedBy,
    });

    console.log(`✅ Leave record created: ${leaveRecord._id}`);
    console.log(`   Total leaves: ${leaveRecord.leaves.length}`);
    
    // Always update annual balance to ensure correct balance calculation on creation
    console.log("📊 Updating annual balance...");
    await leaveRecord.updateAnnualBalance();
    await leaveRecord.save(); // Save again to persist the updated balance

    // Populate references before returning
    await leaveRecord.populate("employeeId", "personalDetails employeeId status");
    
    // Only populate organizationId if it exists
    if (leaveRecord.organizationId) {
      await leaveRecord.populate("organizationId", "name");
    }

    // Log activity
    await logActivity({
      action: leaveRecord.isNew ? "created" : "updated", // isNew is not available here on found object unless strictly new. Logic below handles creation.
      entity: "Leave",
      entityId: leaveRecord._id,
      description: `Applied leave for ${leaveRecord.employeeName} (${getMonthName(month)} ${year})`,
      performedBy: {
        userId: body.createdBy,
        name: "Admin/User"
      },
      details: {
        employeeId,
        month,
        year,
        totalDays: leaveRecord.leaves.length
      },
      req: request
    });



    return NextResponse.json(leaveRecord, { status: 201 });
  } catch (error) {
    console.error("❌ Error in POST /api/payroll/leaves:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to get month name
function getMonthName(month) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1];
}