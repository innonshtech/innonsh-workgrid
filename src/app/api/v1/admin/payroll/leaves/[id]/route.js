// src/app/api/payroll/leaves/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Leave from "@/lib/db/models/payroll/Leave";

// GET single leave record
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;

    console.log(id);
    
    const leave = await Leave.findById(id)
      .populate("employeeId", "personalDetails employeeId status")
      .populate("organizationId", "name");

    if (!leave) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    console.log("Leaves :: :: ",leave);
    
    return NextResponse.json(leave);
  } catch (error) {
    console.error("Error in GET /api/payroll/leaves/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE leave record
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    console.log("Update Leave Body:", body);

    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    // Update fields
    if (body.leaves) leave.leaves = body.leaves;
    if (body.notes !== undefined) leave.notes = body.notes;
    if (body.status) leave.status = body.status;
    if (body.updatedBy) leave.updatedBy = body.updatedBy;

    // Calculate summary
    leave.calculateSummary();

    // Update annual balance if there are unpaid leaves or if approved
    const hasUnpaidLeaves = body.leaves && body.leaves.some(leave => 
      leave.leaveType === 'Unpaid' || leave.leaveType === 'Half-Day Unpaid'
    );
    
    if (hasUnpaidLeaves || body.status === "Approved") {
      console.log("📊 Updating annual balance due to unpaid leaves or approval...");
      await leave.updateAnnualBalance();
    }

    await leave.save();

    // Populate references
    await leave.populate("employeeId", "personalDetails employeeId status");
    await leave.populate("organizationId", "name");

    console.log("✅ Leave record updated:", leave._id);

    return NextResponse.json(leave);
  } catch (error) {
    console.error("❌ Error in PUT /api/payroll/leaves/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE leave record
export async function DELETE(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;

    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    // Store employee and year for balance recalculation
    const { employeeId, year } = leave;

    // Delete the record
    await Leave.findByIdAndDelete(id);

    // Recalculate annual balance for remaining records
    const remainingLeaves = await Leave.find({
      employeeId,
      year,
    });

    if (remainingLeaves.length > 0) {
      console.log("📊 Recalculating annual balance after deletion...");
      await remainingLeaves[0].updateAnnualBalance();
      // Save all remaining records with updated balance
      await Promise.all(remainingLeaves.map(record => record.save()));
    }

    console.log("✅ Leave record deleted:", id);

    return NextResponse.json({ message: "Leave record deleted successfully" });
  } catch (error) {
    console.error("❌ Error in DELETE /api/payroll/leaves/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}