import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Designation from "@/lib/db/models/crm/organization/Designation";
import Organization from "@/lib/db/models/crm/organization/Organization";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();
        
        if (authUser.role === "admin") {
            body.organizationId = authUser.organizationId;
        }

        if (body.names && Array.isArray(body.names)) {
            if (!body.organizationId || body.names.length === 0) {
                return NextResponse.json({ success: false, error: "Organization ID and at least one Designation name are required" }, { status: 400 });
            }

            const organization = await Organization.findById(body.organizationId);
            if (!organization) return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });

            // Filter out existing ones
            const existingDesignations = await Designation.find({
                name: { $in: body.names.map(n => n.trim()) },
                organizationId: body.organizationId
            });
            const existingNames = existingDesignations.map(d => d.name.toLowerCase());
            
            const toCreate = body.names
                .map(n => n.trim())
                .filter(n => n && !existingNames.includes(n.toLowerCase()))
                .map(name => ({
                    name,
                    organizationId: body.organizationId,
                    description: body.description,
                    status: body.status || "Active",
                    createdBy: authUser.id || authUser._id,
                    updatedBy: authUser.id || authUser._id
                }));

            if (toCreate.length === 0) {
                return NextResponse.json({ success: false, error: "All provided designations already exist" }, { status: 400 });
            }

            const created = await Designation.insertMany(toCreate);

            await logActivity({
                action: "created",
                entity: "Designation",
                entityId: created[0]._id, // Just logging the first one for bulk
                description: `Created ${created.length} designations in ${organization.name}`,
                req: request
            });

            return NextResponse.json(
                { success: true, message: `Successfully created ${created.length} designations` },
                { status: 201 }
            );
        }

        // Single creation fallback
        if (!body.organizationId || !body.name) {
            return NextResponse.json(
                { success: false, error: "Organization ID and Designation name are required" },
                { status: 400 }
            );
        }

        const organization = await Organization.findById(body.organizationId);
        if (!organization) {
            return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
        }

        const existingDesignation = await Designation.findOne({
            name: body.name.trim(),
            organizationId: body.organizationId
        });

        if (existingDesignation) {
            return NextResponse.json(
                { success: false, error: "Designation name already exists in this organization" },
                { status: 400 }
            );
        }

        body.createdBy = authUser.id || authUser._id;
        body.updatedBy = authUser.id || authUser._id;
        const designation = await Designation.create(body);
        const populatedDesignation = await Designation.findById(designation._id)
            .populate('organizationId', 'name')
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "created",
            entity: "Designation",
            entityId: designation._id,
            description: `Created designation: ${designation.name} in ${populatedDesignation.organizationId?.name}`,
            performedBy: {
                userId: populatedDesignation.createdBy?._id,
                name: populatedDesignation.createdBy?.name || "Admin/User",
                email: populatedDesignation.createdBy?.email,
                role: populatedDesignation.createdBy?.role
            },
            req: request
        });

        return NextResponse.json(
            { success: true, message: "Designation created successfully", designation: populatedDesignation },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Designation error:", error);
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
        const status = searchParams.get("status");

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        if (authUser.role === "admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        } else if (organizationId) {
            query.organizationId = organizationId;
        }
        if (status) {
            query.status = status;
        }

        const designations = await Designation.find(query)
            .populate('organizationId', 'name')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Designation.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: designations,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Designations error:", error);
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
            return NextResponse.json({ success: false, error: "Designation ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const existingDesignation = await Designation.findById(id);
        if (!existingDesignation) {
            return NextResponse.json({ success: false, error: "Designation not found" }, { status: 404 });
        }

        if (body.name) {
            const duplicateDesignation = await Designation.findOne({
                name: body.name.trim(),
                organizationId: body.organizationId || existingDesignation.organizationId,
                _id: { $ne: id }
            });
            if (duplicateDesignation) {
                return NextResponse.json(
                    { success: false, error: "Designation name already exists in this organization" },
                    { status: 400 }
                );
            }
        }

        body.updatedBy = authUser.id || authUser._id;
        const updatedDesignation = await Designation.findByIdAndUpdate(
            id,
            { ...body, updatedAt: new Date() },
            { new: true }
        ).populate('organizationId', 'name')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "updated",
            entity: "Designation",
            entityId: id,
            description: `Updated designation: ${updatedDesignation.name}`,
            performedBy: {
                userId: updatedDesignation.updatedBy?._id,
                name: updatedDesignation.updatedBy?.name || "Admin/User",
                email: updatedDesignation.updatedBy?.email,
                role: updatedDesignation.updatedBy?.role
            },
            req: request
        });

        return NextResponse.json({ success: true, message: "Designation updated successfully", designation: updatedDesignation });
    } catch (error) {
        console.error("Update Designation error:", error);
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
            return NextResponse.json({ success: false, error: "Designation ID is required" }, { status: 400 });
        }

        const designation = await Designation.findById(id);
        if (!designation) {
            return NextResponse.json({ success: false, error: "Designation not found" }, { status: 404 });
        }

        await Designation.findByIdAndDelete(id);
        await logActivity({
            action: "deleted",
            entity: "Designation",
            entityId: id,
            description: `Deleted designation: ${designation.name}`,
            req: request
        });

        return NextResponse.json({ success: true, message: "Designation deleted successfully" });
    } catch (error) {
        console.error("Delete Designation error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
