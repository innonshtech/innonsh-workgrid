import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import EmployeeSubCategory from "@/lib/db/models/crm/employee/EmployeeSubCategory";
import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
import Organization from "@/lib/db/models/crm/organization/Organization";
import Department from "@/lib/db/models/crm/Department/department";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    console.log("Request body:", body);

    const { 
      organizationName, 
      departmentName, 
      employeeType, 
      employeeCategory,
      employeeSubCategory,
      createdBy 
    } = body;

    // Validate required fields
    if (!organizationName || !departmentName || !employeeType || !employeeCategory || !employeeSubCategory) {
      return NextResponse.json(
        { error: "All fields are required" },
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

    // Find employee type
    const employeeTypeDoc = await EmployeeType.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeType: employeeType.trim()
    });

    if (!employeeTypeDoc) {
      return NextResponse.json(
        { error: "Employee type not found" },
        { status: 404 }
      );
    }

    // Find employee category
    const employeeCategoryDoc = await EmployeeCategory.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategory: employeeCategory.trim()
    });

    if (!employeeCategoryDoc) {
      return NextResponse.json(
        { error: "Employee category not found" },
        { status: 404 }
      );
    }

    // Check if sub-category already exists
    const existingSubCategory = await EmployeeSubCategory.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategoryId: employeeCategoryDoc._id,
      employeeSubCategory: employeeSubCategory.trim()
    });

    if (existingSubCategory) {
      return NextResponse.json(
        { error: "Employee sub-category already exists for this category" },
        { status: 409 }
      );
    }

    // Create payload
    const payload = {
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategoryId: employeeCategoryDoc._id,
      employeeSubCategory: employeeSubCategory.trim(),
      createdBy: createdBy || "66e2f79f3b8d2e1f1a9d9c33"
    };

    console.log("Creating employee sub-category with payload:", payload);

    const newSubCategory = await EmployeeSubCategory.create(payload);

    // Populate the created document for response
    const populatedSubCategory = await EmployeeSubCategory.findById(newSubCategory._id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("employeeCategoryId", "employeeCategory")
      .populate("createdBy", "name");

    console.log("Created employee sub-category:", populatedSubCategory);

    return NextResponse.json(
      { 
        message: "Employee Sub-Category created successfully", 
        subCategory: populatedSubCategory 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee sub-category:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Employee sub-category already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const organizationId = searchParams.get("organizationId");
    const departmentId = searchParams.get("departmentId");
    const employeeTypeId = searchParams.get("employeeTypeId");
    const employeeCategoryId = searchParams.get("employeeCategoryId");

    // Build query
    let query = {};
    if (organizationId) query.organizationId = organizationId;
    if (departmentId) query.departmentId = departmentId;
    if (employeeTypeId) query.employeeTypeId = employeeTypeId;
    if (employeeCategoryId) query.employeeCategoryId = employeeCategoryId;

    const data = await EmployeeSubCategory.find(query)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("employeeCategoryId", "employeeCategory")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await EmployeeSubCategory.countDocuments(query);
    
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
    console.error("Error fetching employee sub-categories:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}