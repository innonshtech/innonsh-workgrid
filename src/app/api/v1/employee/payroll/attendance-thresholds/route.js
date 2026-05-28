import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceThreshold from "@/lib/db/models/payroll/AttendanceThreshold";
import Organization from "@/lib/db/models/crm/organization/Organization";
import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
// GET - Fetch all attendance thresholds
export async function GET(request) {
  try {
    await dbConnect();

    const thresholds = await AttendanceThreshold.find()
      .populate('criteria.organizationId', 'name')
      .populate('criteria.categoryId', 'employeeCategory')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      thresholds,
    });
  } catch (error) {
    console.error("Error fetching attendance thresholds:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new attendance threshold
export async function POST(request) {
  console.log('POST /api/payroll/attendance-thresholds called');
  try {
    await dbConnect();

    const body = await request.json();
    const { criteria, threshold, isActive } = body;

    // Validate required fields
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0 || !threshold) {
      return NextResponse.json(
        { success: false, error: "At least one criteria group and threshold are required" },
        { status: 400 }
      );
    }

    // Validate each criteria item
    for (const item of criteria) {
      if (!item.organizationId || !item.categoryId) {
        return NextResponse.json(
          { success: false, error: "Organization and Category are required for all groups" },
          { status: 400 }
        );
      }
    }

    // Create new threshold
    console.log('Creating threshold with data:', {
      criteria,
      threshold: parseInt(threshold),
      isActive: isActive !== undefined ? isActive : true,
    });

    const newThreshold = await AttendanceThreshold.create({
      criteria,
      threshold: parseInt(threshold),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: body.createdBy || null, // TODO: Get from session
      updatedBy: body.updatedBy || null,
    });

    // Populate for response
    await newThreshold.populate('criteria.organizationId', 'name');
    await newThreshold.populate('criteria.categoryId', 'employeeCategory');

    return NextResponse.json({
      success: true,
      threshold: newThreshold,
      message: "Attendance threshold created successfully",
    });
  } catch (error) {
    console.error("Error creating attendance threshold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update attendance threshold
export async function PUT(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { id, criteria, threshold, isActive } = body;

    // Validate required fields
    if (!id || !criteria || !Array.isArray(criteria) || criteria.length === 0 || !threshold) {
      return NextResponse.json(
        { success: false, error: "ID, criteria, and threshold are required" },
        { status: 400 }
      );
    }

    // Update threshold
    const updatedThreshold = await AttendanceThreshold.findByIdAndUpdate(
      id,
      {
        criteria,
        threshold: parseInt(threshold),
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: body.updatedBy || null,
      },
      { new: true }
    ).populate('criteria.organizationId', 'name')
      .populate('criteria.categoryId', 'employeeCategory');

    if (!updatedThreshold) {
      return NextResponse.json(
        { success: false, error: "Threshold not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      threshold: updatedThreshold,
      message: "Attendance threshold updated successfully",
    });
  } catch (error) {
    console.error("Error updating attendance threshold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete attendance threshold
export async function DELETE(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Threshold ID is required" },
        { status: 400 }
      );
    }

    const deletedThreshold = await AttendanceThreshold.findByIdAndDelete(id);

    if (!deletedThreshold) {
      return NextResponse.json(
        { success: false, error: "Threshold not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance threshold deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance threshold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}