import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import StaffingSubmission from '@/lib/db/models/staffing/StaffingSubmission';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;
    const requirement = await StaffingRequirement.findOne({
      _id: id,
      organizationId: authUser.organizationId
    }).populate('clientId', 'name contactPerson email phone');

    if (!requirement) {
      return NextResponse.json({ success: false, error: "Requirement not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requirement });
  } catch (error) {
    console.error("GET REQUIREMENT BY ID ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    if (body.skillsRequired && typeof body.skillsRequired === 'string') {
      body.skillsRequired = body.skillsRequired.split(',').map(s => s.trim());
    }

    const requirement = await StaffingRequirement.findOneAndUpdate(
      { _id: id, organizationId: authUser.organizationId },
      { $set: body },
      { new: true, runValidators: true }
    ).populate('clientId', 'name contactPerson email phone');

    if (!requirement) {
      return NextResponse.json({ success: false, error: "Requirement not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, requirement, message: "Requirement updated successfully" });
  } catch (error) {
    console.error("PUT REQUIREMENT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;

    const requirement = await StaffingRequirement.findOneAndDelete({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!requirement) {
      return NextResponse.json({ success: false, error: "Requirement not found" }, { status: 404 });
    }

    // Cascade Delete: Clean up all pipeline submissions associated with this requirement
    await StaffingSubmission.deleteMany({ requirementId: id });

    return NextResponse.json({ success: true, message: "Requirement and associated pipeline records deleted successfully" });
  } catch (error) {
    console.error("DELETE REQUIREMENT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
