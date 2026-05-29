import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import StaffingClient from '@/lib/db/models/staffing/StaffingClient';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const query = { organizationId: authUser.organizationId };
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    const requirements = await StaffingRequirement.find(query)
      .populate('clientId', 'name contactPerson email phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, requirements });
  } catch (error) {
    console.error("GET REQUIREMENTS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const body = await request.json();
    const {
      clientId,
      title,
      skillsRequired,
      minExperience,
      maxExperience,
      budgetRange,
      durationMonths,
      openingsCount,
      description
    } = body;

    if (!clientId || !title) {
      return NextResponse.json({ success: false, error: "Client ID and job title are required" }, { status: 400 });
    }

    // Verify client belongs to organization
    const client = await StaffingClient.findOne({
      _id: clientId,
      organizationId: authUser.organizationId
    });
    if (!client) {
      return NextResponse.json({ success: false, error: "Invalid client selected" }, { status: 400 });
    }

    const requirement = await StaffingRequirement.create({
      clientId,
      title,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : skillsRequired ? skillsRequired.split(',').map(s => s.trim()) : [],
      minExperience: Number(minExperience) || 0,
      maxExperience: Number(maxExperience) || 0,
      budgetRange: budgetRange || "",
      durationMonths: Number(durationMonths) || 0,
      openingsCount: Number(openingsCount) || 1,
      description: description || "",
      organizationId: authUser.organizationId,
    });

    return NextResponse.json({ success: true, requirement, message: "Requirement created successfully" }, { status: 201 });
  } catch (error) {
    console.error("POST REQUIREMENT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
