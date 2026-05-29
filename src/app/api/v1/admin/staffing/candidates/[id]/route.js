import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;
    const candidate = await StaffingCandidate.findOne({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate });
  } catch (error) {
    console.error("GET CANDIDATE BY ID ERROR:", error);
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

    const candidate = await StaffingCandidate.findOneAndUpdate(
      { _id: id, organizationId: authUser.organizationId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate, message: "Candidate updated successfully" });
  } catch (error) {
    console.error("PUT CANDIDATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;

    const candidate = await StaffingCandidate.findOneAndDelete({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("DELETE CANDIDATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
