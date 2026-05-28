import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Bank from "@/lib/db/models/crm/organization/Bank";
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
                return NextResponse.json({ success: false, error: "Organization ID and at least one Bank name are required" }, { status: 400 });
            }

            const organization = await Organization.findById(body.organizationId);
            if (!organization) return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });

            // Filter out existing ones
            const existingBanks = await Bank.find({
                name: { $in: body.names.map(n => n.trim()) },
                organizationId: body.organizationId
            });
            const existingNames = existingBanks.map(b => b.name.toLowerCase());
            
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
                return NextResponse.json({ success: false, error: "All provided banks already exist" }, { status: 400 });
            }

            const created = await Bank.insertMany(toCreate);

            await logActivity({
                action: "created",
                entity: "Bank",
                entityId: created[0]._id, // Just logging the first one for bulk
                description: `Created ${created.length} banks in ${organization.name}`,
                req: request
            });

            return NextResponse.json(
                { success: true, message: `Successfully created ${created.length} banks` },
                { status: 201 }
            );
        }

        // Single creation fallback
        if (!body.organizationId || !body.name) {
            return NextResponse.json(
                { success: false, error: "Organization ID and Bank name are required" },
                { status: 400 }
            );
        }

        const organization = await Organization.findById(body.organizationId);
        if (!organization) {
            return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
        }

        const existingBank = await Bank.findOne({
            name: body.name.trim(),
            organizationId: body.organizationId
        });

        if (existingBank) {
            return NextResponse.json(
                { success: false, error: "Bank name already exists in this organization" },
                { status: 400 }
            );
        }

        body.createdBy = authUser.id || authUser._id;
        body.updatedBy = authUser.id || authUser._id;
        const bank = await Bank.create(body);
        const populatedBank = await Bank.findById(bank._id)
            .populate('organizationId', 'name')
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "created",
            entity: "Bank",
            entityId: bank._id,
            description: `Created bank: ${bank.name} in ${populatedBank.organizationId?.name}`,
            performedBy: {
                userId: populatedBank.createdBy?._id,
                name: populatedBank.createdBy?.name || "Admin/User",
                email: populatedBank.createdBy?.email,
                role: populatedBank.createdBy?.role
            },
            req: request
        });

        return NextResponse.json(
            { success: true, message: "Bank created successfully", bank: populatedBank },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Bank error:", error);
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

        const banks = await Bank.find(query)
            .populate('organizationId', 'name')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Bank.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: banks,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Banks error:", error);
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
            return NextResponse.json({ success: false, error: "Bank ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const existingBank = await Bank.findById(id);
        if (!existingBank) {
            return NextResponse.json({ success: false, error: "Bank not found" }, { status: 404 });
        }

        if (body.name) {
            const duplicateBank = await Bank.findOne({
                name: body.name.trim(),
                organizationId: body.organizationId || existingBank.organizationId,
                _id: { $ne: id }
            });
            if (duplicateBank) {
                return NextResponse.json(
                    { success: false, error: "Bank name already exists in this organization" },
                    { status: 400 }
                );
            }
        }

        body.updatedBy = authUser.id || authUser._id;
        const updatedBank = await Bank.findByIdAndUpdate(
            id,
            { ...body, updatedAt: new Date() },
            { new: true }
        ).populate('organizationId', 'name')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "updated",
            entity: "Bank",
            entityId: id,
            description: `Updated bank: ${updatedBank.name}`,
            performedBy: {
                userId: updatedBank.updatedBy?._id,
                name: updatedBank.updatedBy?.name || "Admin/User",
                email: updatedBank.updatedBy?.email,
                role: updatedBank.updatedBy?.role
            },
            req: request
        });

        return NextResponse.json({ success: true, message: "Bank updated successfully", bank: updatedBank });
    } catch (error) {
        console.error("Update Bank error:", error);
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
            return NextResponse.json({ success: false, error: "Bank ID is required" }, { status: 400 });
        }

        const bank = await Bank.findById(id);
        if (!bank) {
            return NextResponse.json({ success: false, error: "Bank not found" }, { status: 404 });
        }

        await Bank.findByIdAndDelete(id);
        await logActivity({
            action: "deleted",
            entity: "Bank",
            entityId: id,
            description: `Deleted bank: ${bank.name}`,
            req: request
        });

        return NextResponse.json({ success: true, message: "Bank deleted successfully" });
    } catch (error) {
        console.error("Delete Bank error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
