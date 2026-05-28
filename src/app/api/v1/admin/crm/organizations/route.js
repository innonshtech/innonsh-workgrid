import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Organization from "@/lib/db/models/crm/organization/Organization";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    // Allow admin, HR, company_admin, and super_admin to view organizations
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const filter = {};
    if (status && status !== "all") filter.status = status;

    // SaaS PROTECTION: Scope to the user's organization if they are not a super_admin
    if (authUser.role !== "super_admin" && authUser.organizationId) {
      filter._id = authUser.organizationId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const organizations = await Organization.find(filter).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    console.error("CRM GET ORGANIZATIONS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
  }
}
