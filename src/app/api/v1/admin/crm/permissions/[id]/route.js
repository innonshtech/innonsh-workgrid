import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Permission from "@/lib/db/models/crm/Permission/Permission";
import User from "@/lib/db/models/User";
import { logActivity } from "@/lib/logger";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;

    const permission = await Permission.findById(id);

    if (!permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error("Get permission error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();

    // Check for duplicate slug if being updated
    if (body.slug) {
        const existingPermission = await Permission.findOne({ 
            slug: body.slug,
             _id: { $ne: id }
        });
        if (existingPermission) {
        return NextResponse.json(
            { error: "Permission with this slug already exists" },
            { status: 400 }
        );
        }
    }

    const permission = await Permission.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    let performer = null;
    if (body.updatedBy) {
      performer = await User.findById(body.updatedBy);
    }

    await logActivity({
      action: "updated",
      entity: "Permission",
      entityId: id,
      description: `Updated permission: ${permission.name}`,
      performedBy: {
        userId: body.updatedBy || "System",
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      req: request
    });

    return NextResponse.json(
      { message: "Permission updated successfully", permission },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update permission error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;

    const permission = await Permission.findByIdAndDelete(id);

    if (!permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    await logActivity({
      action: "deleted",
      entity: "Permission",
      entityId: id,
      description: `Deleted permission: ${permission.name}`,
      req: request
    });

    return NextResponse.json(
      { message: "Permission deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete permission error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
