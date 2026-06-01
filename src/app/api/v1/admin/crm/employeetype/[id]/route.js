import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import mongoose from "mongoose";
import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
import Organization from "@/lib/db/models/crm/organization/Organization";
import Department from "@/lib/db/models/crm/Department/department";

import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
    await dbConnect();
    const { id } = await params;
    
    const item = await EmployeeType.findById(id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!item) {
      return NextResponse.json({ error: "Employee Type not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching employee type:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const { employeeType, organizationName, departmentName } = body;

    // Build update payload
    const updateData = {};
    
    if (employeeType) {
      updateData.employeeType = employeeType.trim();
    }

    // If organization is being updated, find the new organization ID
    if (organizationName) {
      const organization = await Organization.findOne({ name: organizationName });
      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      updateData.organizationId = organization._id;
    }

    // If department is being updated, find the new department ID
    if (departmentName) {
      const department = await Department.findOne({ departmentName });
      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }
      updateData.departmentId = department._id;
    }

    // Add updatedBy
    updateData.updatedBy = authUser.id;

    const updated = await EmployeeType.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate("organizationId", "name")
    .populate("departmentId", "departmentName")
    .populate("updatedBy", "name email");

    if (!updated) {
      return NextResponse.json({ error: "Employee Type not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Employee Type updated successfully",
      employeeType: updated,
    });
  } catch (error) {
    console.error("Error updating employee type:", error);
    
    // Unique index conflict
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Employee type already exists for this department" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    await dbConnect();
    const { id } = await params;

    const deleted = await EmployeeType.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Employee Type not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Employee Type deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee type:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}