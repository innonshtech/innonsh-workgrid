import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Team from "@/lib/db/models/crm/organization/Team";
import Department from "@/lib/db/models/crm/Department/department";
import mongoose from "mongoose";
import { logActivity } from "@/lib/logger";

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        if (!body.departmentId || !body.name) {
            return NextResponse.json(
                { success: false, error: "Department ID and Team name are required" },
                { status: 400 }
            );
        }

        const department = await Department.findById(body.departmentId);
        if (!department) {
            return NextResponse.json({ success: false, error: "Department not found" }, { status: 404 });
        }

        const existingTeam = await Team.findOne({
            name: body.name.trim(),
            departmentId: body.departmentId
        });

        if (existingTeam) {
            return NextResponse.json(
                { success: false, error: "Team name already exists in this department" },
                { status: 400 }
            );
        }

        const team = await Team.create(body);
        const populatedTeam = await Team.findById(team._id)
            .populate({
                path: 'departmentId',
                select: 'departmentName organizationId',
                populate: { path: 'organizationId', select: 'name' }
            })
            .populate('teamLead', 'personalDetails.firstName personalDetails.lastName')
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "created",
            entity: "Team",
            entityId: team._id,
            description: `Created team: ${team.name} in ${populatedTeam.departmentId?.departmentName}`,
            performedBy: {
                userId: populatedTeam.createdBy?._id,
                name: populatedTeam.createdBy?.name || "Admin/User",
                email: populatedTeam.createdBy?.email,
                role: populatedTeam.createdBy?.role
            },
            req: request
        });

        return NextResponse.json(
            { success: true, message: "Team created successfully", team: populatedTeam },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Team error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";
        const departmentId = searchParams.get("departmentId");

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        if (departmentId) {
            try {
                query.departmentId = new mongoose.Types.ObjectId(departmentId);
            } catch (err) {
                console.error("Invalid departmentId in query:", departmentId);
            }
        }

        const teams = await Team.find(query)
            .populate({
                path: 'departmentId',
                select: 'departmentName organizationId',
                populate: { path: 'organizationId', select: 'name' }
            })
            .populate('teamLead', 'personalDetails.firstName personalDetails.lastName')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Team.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: teams,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get Teams error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Team ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const existingTeam = await Team.findById(id);
        if (!existingTeam) {
            return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
        }

        if (body.name) {
            const duplicateTeam = await Team.findOne({
                name: body.name.trim(),
                departmentId: body.departmentId || existingTeam.departmentId,
                _id: { $ne: id }
            });
            if (duplicateTeam) {
                return NextResponse.json(
                    { success: false, error: "Team name already exists in this department" },
                    { status: 400 }
                );
            }
        }

        const updatedTeam = await Team.findByIdAndUpdate(
            id,
            { ...body, updatedAt: new Date() },
            { new: true }
        ).populate({
            path: 'departmentId',
            select: 'departmentName organizationId',
            populate: { path: 'organizationId', select: 'name' }
        })
            .populate('teamLead', 'personalDetails.firstName personalDetails.lastName')
            .populate('updatedBy', 'name email role');

        await logActivity({
            action: "updated",
            entity: "Team",
            entityId: id,
            description: `Updated team: ${updatedTeam.name}`,
            performedBy: {
                userId: updatedTeam.updatedBy?._id,
                name: updatedTeam.updatedBy?.name || "Admin/User",
                email: updatedTeam.updatedBy?.email,
                role: updatedTeam.updatedBy?.role
            },
            req: request
        });

        return NextResponse.json({ success: true, message: "Team updated successfully", team: updatedTeam });
    } catch (error) {
        console.error("Update Team error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Team ID is required" }, { status: 400 });
        }

        const team = await Team.findById(id);
        if (!team) {
            return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
        }

        await Team.findByIdAndDelete(id);
        await logActivity({
            action: "deleted",
            entity: "Team",
            entityId: id,
            description: `Deleted team: ${team.name}`,
            req: request
        });

        return NextResponse.json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
        console.error("Delete Team error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
