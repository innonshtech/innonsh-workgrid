import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import CostCenter from "@/lib/db/models/finance/CostCenter";
import JournalEntry from "@/lib/db/models/finance/JournalEntry";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        const body = await request.json();

        if (!body.code || !body.name) {
            return NextResponse.json(
                { error: "Cost Center Code and Name are required" },
                { status: 400 }
            );
        }

        const existingCC = await CostCenter.findOne({ code: body.code.trim() });
        if (existingCC) {
            return NextResponse.json(
                { error: "Cost Center code already exists" },
                { status: 400 }
            );
        }

        const costCenter = await CostCenter.create(body);
        const populatedCC = await CostCenter.findById(costCenter._id)
            .populate('manager', 'personalDetails.firstName personalDetails.lastName')
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "created",
            entity: "CostCenter",
            entityId: costCenter._id,
            description: `Created cost center: ${costCenter.name} (${costCenter.code})`,
            performedBy: {
                userId: populatedCC.createdBy?._id,
                name: populatedCC.createdBy?.name || "Admin/User",
                email: populatedCC.createdBy?.email,
                role: populatedCC.createdBy?.role
            },
            req: request
        });

        return NextResponse.json(
            { message: "Cost Center created successfully", costCenter: populatedCC },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Cost Center error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function GET(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 100; // Increased limit for manager view
        const search = searchParams.get("search") || "";

        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { code: { $regex: search, $options: "i" } }
            ];
        }

        // Fetch cost centers
        const costCenters = await CostCenter.find(query)
            .populate('manager', 'personalDetails.firstName personalDetails.lastName')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ code: 1 })
            .lean();

        // Dynamically calculate spent amount per cost center
        const stats = await JournalEntry.aggregate([
            { $match: { status: 'Posted' } },
            { $unwind: '$lines' },
            { $match: { 'lines.costCenter': { $exists: true } } },
            {
                $group: {
                    _id: '$lines.costCenter',
                    totalSpent: { $sum: '$lines.debit' } // Aggregate debits (expenses/assets)
                }
            }
        ]);

        const spentMap = stats.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.totalSpent;
            return acc;
        }, {});

        const enrichedData = costCenters.map(cc => ({
            ...cc,
            spent: spentMap[cc._id.toString()] || 0
        }));

        const total = await CostCenter.countDocuments(query);

        return NextResponse.json({
            data: enrichedData,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Cost Centers error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Cost Center ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const existingCC = await CostCenter.findById(id);
        if (!existingCC) {
            return NextResponse.json({ error: "Cost Center not found" }, { status: 404 });
        }

        if (body.code && body.code !== existingCC.code) {
            const duplicateCC = await CostCenter.findOne({ code: body.code.trim() });
            if (duplicateCC) {
                return NextResponse.json({ error: "Cost Center code already exists" }, { status: 400 });
            }
        }

        const updatedCC = await CostCenter.findByIdAndUpdate(
            id,
            { ...body, updatedAt: new Date() },
            { new: true }
        ).populate('manager', 'personalDetails.firstName personalDetails.lastName')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "updated",
            entity: "CostCenter",
            entityId: id,
            description: `Updated cost center: ${updatedCC.name}`,
            performedBy: {
                userId: updatedCC.updatedBy?._id,
                name: updatedCC.updatedBy?.name || "Admin/User",
                email: updatedCC.updatedBy?.email,
                role: updatedCC.updatedBy?.role
            },
            req: request
        });

        return NextResponse.json({ message: "Cost Center updated successfully", costCenter: updatedCC });
    } catch (error) {
        console.error("Update Cost Center error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Cost Center ID is required" }, { status: 400 });
        }

        const cc = await CostCenter.findById(id);
        if (!cc) {
            return NextResponse.json({ error: "Cost Center not found" }, { status: 404 });
        }

        await CostCenter.findByIdAndDelete(id);
        await logActivity({
            action: "deleted",
            entity: "CostCenter",
            entityId: id,
            description: `Deleted cost center: ${cc.name}`,
            req: request
        });

        return NextResponse.json({ message: "Cost Center deleted successfully" });
    } catch (error) {
        console.error("Delete Cost Center error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
