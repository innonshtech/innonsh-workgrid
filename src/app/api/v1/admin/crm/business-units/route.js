import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import BusinessUnit from "@/lib/db/models/crm/organization/BusinessUnit";
import Organization from "@/lib/db/models/crm/organization/Organization";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();
        
        // SaaS PROTECTION: Admin must use their assigned organizationId
        if (authUser.role === "admin") {
            body.organizationId = authUser.organizationId;
        }

        if (!body.organizationId || !body.name) {
            return NextResponse.json(
                { success: false, error: "Organization ID and Business Unit name are required" },
                { status: 400 }
            );
        }

        const organization = await Organization.findById(body.organizationId);
        if (!organization) {
            return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
        }

        const existingBU = await BusinessUnit.findOne({
            name: body.name.trim(),
            organizationId: body.organizationId
        });

        if (existingBU) {
            return NextResponse.json(
                { success: false, error: "Business Unit name already exists in this organization" },
                { status: 400 }
            );
        }

        const businessUnit = await BusinessUnit.create(body);
        const populatedBU = await BusinessUnit.findById(businessUnit._id)
            .populate('organizationId', 'name')
            .populate('headOfUnit', 'personalDetails.firstName personalDetails.lastName')
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "created",
            entity: "BusinessUnit",
            entityId: businessUnit._id,
            description: `Created business unit: ${businessUnit.name} in ${populatedBU.organizationId?.name}`,
            performedBy: {
                userId: populatedBU.createdBy?._id,
                name: populatedBU.createdBy?.name || "Admin/User",
                email: populatedBU.createdBy?.email,
                role: populatedBU.createdBy?.role
            },
            req: request
        });

        return NextResponse.json(
            { success: true, message: "Business Unit created successfully", businessUnit: populatedBU },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Business Unit error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";
        const organizationId = searchParams.get("organizationId");

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        if (authUser.role === "admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        } else if (organizationId) {
            query.organizationId = organizationId;
        }

        const businessUnits = await BusinessUnit.find(query)
            .populate('organizationId', 'name')
            .populate('headOfUnit', 'personalDetails.firstName personalDetails.lastName')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await BusinessUnit.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: businessUnits,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Business Units error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Business Unit ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const existingBU = await BusinessUnit.findById(id);
        if (!existingBU) {
            return NextResponse.json({ success: false, error: "Business Unit not found" }, { status: 404 });
        }

        if (body.name) {
            const duplicateBU = await BusinessUnit.findOne({
                name: body.name.trim(),
                organizationId: body.organizationId || existingBU.organizationId,
                _id: { $ne: id }
            });
            if (duplicateBU) {
                return NextResponse.json(
                    { success: false, error: "Business Unit name already exists in this organization" },
                    { status: 400 }
                );
            }
        }

        const updatedBU = await BusinessUnit.findByIdAndUpdate(
            id,
            { ...body, updatedAt: new Date() },
            { new: true }
        ).populate('organizationId', 'name')
            .populate('headOfUnit', 'personalDetails.firstName personalDetails.lastName')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "updated",
            entity: "BusinessUnit",
            entityId: id,
            description: `Updated business unit: ${updatedBU.name}`,
            performedBy: {
                userId: updatedBU.updatedBy?._id,
                name: updatedBU.updatedBy?.name || "Admin/User",
                email: updatedBU.updatedBy?.email,
                role: updatedBU.updatedBy?.role
            },
            req: request
        });

        return NextResponse.json({ success: true, message: "Business Unit updated successfully", businessUnit: updatedBU });
    } catch (error) {
        console.error("Update Business Unit error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Business Unit ID is required" }, { status: 400 });
        }

        const bu = await BusinessUnit.findById(id);
        if (!bu) {
            return NextResponse.json({ success: false, error: "Business Unit not found" }, { status: 404 });
        }

        await BusinessUnit.findByIdAndDelete(id);
        await logActivity({
            action: "deleted",
            entity: "BusinessUnit",
            entityId: id,
            description: `Deleted business unit: ${bu.name}`,
            req: request
        });

        return NextResponse.json({ success: true, message: "Business Unit deleted successfully" });
    } catch (error) {
        console.error("Delete Business Unit error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
