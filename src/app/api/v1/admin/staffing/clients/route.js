import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingClient from '@/lib/db/models/staffing/StaffingClient';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const query = { organizationId: authUser.organizationId };
    const clients = await StaffingClient.find(query).sort({ name: 1 });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error("GET CLIENTS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const body = await request.json();
    const { name, contactPerson, email, phone, website, notes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Client name is required" }, { status: 400 });
    }

    const client = await StaffingClient.create({
      name,
      contactPerson,
      email,
      phone,
      website,
      notes,
      organizationId: authUser.organizationId,
    });

    return NextResponse.json({ success: true, client, message: "Client created successfully" }, { status: 201 });
  } catch (error) {
    console.error("POST CLIENT ERROR:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "A client with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
