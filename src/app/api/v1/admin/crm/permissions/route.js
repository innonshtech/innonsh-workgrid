import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Permission from "@/lib/db/models/crm/Permission/Permission";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.slug || !body.module) {
      return NextResponse.json(
        { error: "Name, slug, and module are required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existingPermission = await Permission.findOne({ slug: body.slug });
    if (existingPermission) {
      return NextResponse.json(
        { error: "Permission with this slug already exists" },
        { status: 400 }
      );
    }

    const permission = await Permission.create(body);

    // Fetch createdBy user if available
    let performer = null;
    if (body.createdBy) {
      performer = await User.findById(body.createdBy);
    }

    await logActivity({
      action: "created",
      entity: "Permission",
      entityId: permission._id,
      description: `Created permission: ${permission.name} (${permission.slug})`,
      performedBy: {
        userId: body.createdBy || permission._id, // Fallback
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      details: {
        module: permission.module
      },
      req: request
    });

    return NextResponse.json(
      { message: "Permission created successfully", permission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create permission error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";
    const module = searchParams.get("module") || "";

    // Build query
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (module && module !== "all") {
      query.module = module;
    }

    // If limit is -1, return all (for dropdowns)
    if (limit === -1) {
         const permissions = await Permission.find(query).sort({ module: 1, name: 1 });
         return NextResponse.json({ data: permissions });
    }

    const permissions = await Permission.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Permission.countDocuments(query);

    return NextResponse.json({
      data: permissions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
