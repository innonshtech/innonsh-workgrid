import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
import Organization from "@/lib/db/models/crm/organization/Organization";
import Department from "@/lib/db/models/crm/Department/department";
import Documents from "@/lib/db/models/crm/Documents/Documents";
import mongoose from "mongoose";

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
      supportedDocuments,
      createdBy
    } = body;

    // Validate required fields
    if (!organizationName || !departmentName || !employeeType || !employeeCategory) {
      return NextResponse.json(
        { error: "Organization, department, employee type, and category are required" },
        { status: 400 }
      );
    }

    // Validate supported documents if provided
    let validDocumentIds = [];
    if (supportedDocuments && supportedDocuments.length > 0) {
      // Convert string IDs to ObjectIds
      validDocumentIds = supportedDocuments.map(docId => {
        try {
          return new mongoose.Types.ObjectId(docId);
        } catch (error) {
          console.error("Invalid document ID:", docId);
          return null;
        }
      }).filter(Boolean);

      // Check if documents exist in the database
      const existingDocuments = await Documents?.find({
        _id: { $in: validDocumentIds }
      }).select("_id");

      if (existingDocuments.length !== validDocumentIds.length) {
        return NextResponse.json(
          { error: "One or more document IDs are invalid" },
          { status: 400 }
        );
      }
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
        { error: "Employee type not found for this organization and department" },
        { status: 404 }
      );
    }

    // Check if category already exists
    const existingCategory = await EmployeeCategory.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategory: employeeCategory.trim()
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Employee category already exists for this employee type" },
        { status: 409 }
      );
    }

    // Create payload
    const payload = {
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategory: employeeCategory.trim(),
      createdBy: createdBy || "66e2f79f3b8d2e1f1a9d9c33"
    };

    // Add supported documents if provided
    if (validDocumentIds.length > 0) {
      payload.supportedDocuments = validDocumentIds;
    }

    console.log("Creating employee category with payload:", payload);

    const newCategory = await EmployeeCategory.create(payload);

    // Populate the created document for response
    const populatedCategory = await EmployeeCategory.findById(newCategory._id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("supportedDocuments", "name") // Added
      .populate("createdBy", "name");

    console.log("Created employee category:", populatedCategory);

    return NextResponse.json(
      {
        message: "Employee Category created successfully",
        category: populatedCategory
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee category:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Employee category already exists" },
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

    // Build query
    let query = {};
    if (organizationId) {
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
    if (employeeTypeId) {
      try {
        query.employeeTypeId = new mongoose.Types.ObjectId(employeeTypeId);
      } catch (err) {
        console.error("Invalid employeeTypeId in query:", employeeTypeId);
      }
    }

    const data = await EmployeeCategory.find(query)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("supportedDocuments", "name") // Added population for documents
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await EmployeeCategory.countDocuments(query);

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
    console.error("Error fetching employee categories:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}