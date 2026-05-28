import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceThreshold from "@/lib/db/models/payroll/AttendanceThreshold";

// GET - Fetch single attendance threshold
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;

    const threshold = await AttendanceThreshold.findById(id)
      .populate('criteria.organizationId', 'name')
      .populate('criteria.categoryId', 'employeeCategory')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!threshold) {
      return NextResponse.json(
        { success: false, error: "Threshold not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      threshold,
    });
  } catch (error) {
    console.error("Error fetching attendance threshold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update attendance threshold
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const { criteria, threshold, isActive } = body;

    // Validate required fields
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0 || !threshold) {
      return NextResponse.json(
        { success: false, error: "Criteria and threshold are required" },
        { status: 400 }
      );
    }

    // Check if threshold exists
    const existingThreshold = await AttendanceThreshold.findById(id);
    if (!existingThreshold) {
      return NextResponse.json(
        { success: false, error: "Threshold not found" },
        { status: 404 }
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
export async function DELETE(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;

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