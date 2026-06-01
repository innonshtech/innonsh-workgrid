import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
import Organization from "@/lib/db/models/crm/organization/Organization";
import Department from "@/lib/db/models/crm/Department/department";
import mongoose from "mongoose";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    await dbConnect();

    const body = await request.json();
    console.log("Request body:", body);

    const { organizationName, departmentName, employeeType, createdBy } = body;

    // Validate required fields
    if (!organizationName || !departmentName || !employeeType) {
      return NextResponse.json(
        { error: "Organization, department, and employee type are required" },
        { status: 400 }
      );
    }

    // Find organization by name
    const organization = await Organization.findOne({ name: organizationName });
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find department by name and organization
    const department = await Department.findOne({
      departmentName: departmentName,
      organizationId: organization._id
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found in the specified organization" },
        { status: 404 }
      );
    }

    // Check if employee type already exists
    const existingEmployeeType = await EmployeeType.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeType: employeeType.trim()
    });

    if (existingEmployeeType) {
      return NextResponse.json(
        { error: "Employee type already exists for this department" },
        { status: 409 }
      );
    }

    // Create payload with ObjectId references
    const payload = {
      organizationId: organization._id,
      departmentId: department._id,
      employeeType: employeeType.trim(),
      createdBy: authUser.id
    };

    console.log("Creating employee type with payload:", payload);

    const newEmployeeType = await EmployeeType.create(payload);

    // Populate the created document for response
    const populatedEmployeeType = await EmployeeType.findById(newEmployeeType._id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("createdBy", "name");

    console.log("Created employee type:", populatedEmployeeType);

    return NextResponse.json(
      {
        message: "Employee Type created successfully",
        employeeType: populatedEmployeeType
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee type:", error);

    // Handle duplicate employee type error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Employee type already exists for this department" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const organizationId = searchParams.get("organizationId");
    const departmentId = searchParams.get("departmentId");

    // Build query
    let query = {};
    
    // SaaS PROTECTION: Restrict admin/hr/employees to their own org
    if (authUser.role !== "super_admin" && authUser.organizationId) {
      query.organizationId = authUser.organizationId;
    } else if (organizationId) {
      try {
        query.organizationId = new mongoose.Types.ObjectId(organizationId);
      } catch (err) {
        console.error("Invalid organizationId in query:", organizationId);
      }
    }
    if (departmentId) {
      try {
        query.departmentId = new mongoose.Types.ObjectId(departmentId);
      } catch (err) {
        console.error("Invalid departmentId in query:", departmentId);
      }
    }

    const data = await EmployeeType.find(query)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await EmployeeType.countDocuments(query);

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employee types:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}