
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Department from "@/lib/db/models/crm/Department/department"
import Organization from "@/lib/db/models/crm/organization/Organization";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";
export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);
    
    await dbConnect();

    const body = await request.json();
    
    // SaaS PROTECTION: Admin must use their assigned organizationId
    if (authUser.role === "admin") {
      body.organizationId = authUser.organizationId;
    }


    console.log(body);
    
    // Validate required fields
    if (!body.organizationId || !body.departmentName) {
      return NextResponse.json(
        { error: "Organization ID and department name are required" },
        { status: 400 }
      );
    }

    // Check if organization exists
    const organization = await Organization.findById(body.organizationId);

    console.log(organization);
    
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if department name already exists IN THE SAME ORGANIZATION
    const existingDepartment = await Department.findOne({
      departmentName: body.departmentName.trim(),
      organizationId: body.organizationId // Add this condition
    });

    console.log(existingDepartment);
    
    
    if (existingDepartment) {
      return NextResponse.json(
        { error: "Department name already exists in this organization" },
        { status: 400 }
      );
    }

    const department = await Department.create(body);

    console.log(department);
    

    // Populate organization details for response
    const populatedDepartment = await Department.findById(department._id)
      .populate('organizationId', 'name')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    await logActivity({
      action: "created",
      entity: "Department",
      entityId: department._id,
      description: `Created department: ${department.departmentName} in ${populatedDepartment.organizationId?.name}`,
      performedBy: {
        userId: populatedDepartment.createdBy?._id,
        name: populatedDepartment.createdBy?.name || "Admin/User",
        email: populatedDepartment.createdBy?.email,
        role: populatedDepartment.createdBy?.role
      },
      details: {
        organization: populatedDepartment.organizationId?.name
      },
      req: request
    });

    return NextResponse.json(
      { 
        message: "Department created successfully", 
        department: populatedDepartment 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

// GET All Departments (with pagination and search)
export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 9;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const organizationId = searchParams.get("organizationId") || "";

    // Build query
    let query = {};
    
    if (search) {
      query.departmentName = { $regex: search, $options: "i" };
    }
    
    if (status && status !== "all") {
      query.status = status;
    }

    if (authUser.role === "admin" && authUser.organizationId) {
      query.organizationId = authUser.organizationId;
    } else if (organizationId) {
      query.organizationId = organizationId;
    }

    const departments = await Department.find(query)
      .populate('organizationId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Department.countDocuments(query);

    // Transform data for frontend
    const transformedDepartments = departments.map(dept => ({
      _id: dept._id,
      departmentName: dept.departmentName,
      status: dept.status,
      organizationId: dept.organizationId?._id,
      organizationName: dept.organizationId?.name,
      createdBy: dept.createdBy?.name,
      updatedBy: dept.updatedBy?.name,
      permissions: dept.permissions,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }));

    return NextResponse.json({
      data: transformedDepartments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get departments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update Department
export async function PUT(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.organizationId || !body.departmentName || !body.departmentName.trim()) {
      return NextResponse.json(
        { error: "Organization and department name are required" },
        { status: 400 }
      );
    }

    // Check if department exists
    const existingDepartment = await Department.findById(id);
    if (!existingDepartment) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // SaaS PROTECTION: Admin can only update their own org's departments
    if (authUser.role === 'admin' && existingDepartment.organizationId?.toString() !== authUser.organizationId) {
      return NextResponse.json({ error: "Forbidden: This department does not belong to your organization" }, { status: 403 });
    }

    const duplicateDepartment = await Department.findOne({
      departmentName: body.departmentName.trim(),
      organizationId: body.organizationId,
      _id: { $ne: id } // Exclude the current department being updated
    });

    if (duplicateDepartment) {
      return NextResponse.json(
        { error: "Department name already exists in this organization" },
        { status: 400 }
      );
    }

    // Update department
    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      {
        organizationId: body.organizationId,
        departmentName: body.departmentName.trim(),
        status: body.status,
        permissions: body.permissions,
        updatedBy: body.updatedBy || null,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('organizationId', 'name')
     .populate('createdBy', 'name email role')
     .populate('updatedBy', 'name email role');

    await logActivity({
      action: "updated",
      entity: "Department",
      entityId: updatedDepartment._id,
      description: `Updated department: ${updatedDepartment.departmentName}`,
      performedBy: {
        userId: updatedDepartment.updatedBy?._id,
        name: updatedDepartment.updatedBy?.name || "Admin/User",
        email: updatedDepartment.updatedBy?.email,
        role: updatedDepartment.updatedBy?.role
      },
      req: request
    });

    return NextResponse.json({
      message: "Department updated successfully",
      department: updatedDepartment
    });

  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete Department
export async function DELETE(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // SaaS PROTECTION: Admin can only delete their own org's departments
    if (authUser.role === 'admin' && department.organizationId?.toString() !== authUser.organizationId) {
      return NextResponse.json({ error: "Forbidden: This department does not belong to your organization" }, { status: 403 });
    }

    await Department.findByIdAndDelete(id);

    await logActivity({
      action: "deleted",
      entity: "Department",
      entityId: id,
      description: `Deleted department: ${department.departmentName}`,
      req: request
    });

    return NextResponse.json({ 
      message: "Department deleted successfully" 
    });

  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET Single Department by ID
export async function GET_SINGLE(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const department = await Department.findById(id)
      .populate('organizationId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Transform data for frontend
    const transformedDepartment = {
      _id: department._id,
      departmentName: department.departmentName,
      status: department.status,
      organizationId: department.organizationId?._id,
      organizationName: department.organizationId?.name,
      createdBy: department.createdBy?.name,
      updatedBy: department.updatedBy?.name,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };

    return NextResponse.json(transformedDepartment);

  } catch (error) {
    console.error("Get single department error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}