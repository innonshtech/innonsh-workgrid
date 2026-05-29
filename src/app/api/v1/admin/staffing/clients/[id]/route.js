import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingClient from '@/lib/db/models/staffing/StaffingClient';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;
    const client = await StaffingClient.findOne({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error("GET CLIENT BY ID ERROR:", error);
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

    const client = await StaffingClient.findOneAndUpdate(
      { _id: id, organizationId: authUser.organizationId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client, message: "Client updated successfully" });
  } catch (error) {
    console.error("PUT CLIENT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { id } = await params;

    const client = await StaffingClient.findOneAndDelete({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error("DELETE CLIENT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
