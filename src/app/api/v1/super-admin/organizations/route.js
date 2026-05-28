// src/app/api/organizations/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Organization from "@/lib/db/models/crm/organization/Organization";
import cloudinary from "@/lib/cloudinary";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;
    const filter = {};

    if (status && status !== "all") filter.status = status;

    // SaaS PROTECTION: Restrict admin to their own org
    if (authUser.role === "admin" && authUser.organizationId) {
      filter._id = authUser.organizationId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const organizations = await Organization.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Organization.countDocuments(filter);

    return NextResponse.json({
      organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    // Only super_admin can create new top-level Organizations in this SaaS setup
    authorize(authUser, ["super_admin"]);

    await dbConnect();

    const formData = await request.formData();

    const name = formData.get("name");
    const email = formData.get("email");
    const description = formData.get("description");
    const phone = formData.get("phone");
    const address = formData.get("address");
    const memberCount = formData.get("memberCount") || 0;
    const website = formData.get("website");
    const established = formData.get("established");
    const status = formData.get("status") || "Active";

    const file = formData.get("logo");

    // generate orgId
    const lastOrg = await Organization.findOne().sort({ createdAt: -1 });
    let newOrgId = "ORG001";

    if (lastOrg?.orgId) {
      const num = parseInt(lastOrg.orgId.replace("ORG", "")) + 1;
      newOrgId = `ORG${String(num).padStart(3, "0")}`;
    }

    // duplicate email validation removed as per user request
    // multiple organizations can have the same email

    let logoUrl = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const upload = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "organizations" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });

      logoUrl = upload.secure_url;
    }

    const organization = await Organization.create({
      orgId: newOrgId,
      name,
      email,
      description,
      phone,
      address,
      memberCount: Number(memberCount),
      website,
      established: established || null,
      status,
      logo: logoUrl,
    });

    // Fetch createdBy user if available
    let performer = null;
    const createdBy = formData.get("createdBy");
    if (createdBy) {
      performer = await User.findById(createdBy);
    }

    await logActivity({
      action: "created",
      entity: "Organization",
      entityId: organization._id,
      description: `Created organization: ${name} (${newOrgId})`,
      performedBy: {
         userId: createdBy,
         name: performer?.name || "Admin/User",
         email: performer?.email,
         role: performer?.role
      },
      details: {
        email,
        phone,
        website
      },
      req: request
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
