import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import PerformanceGoal from "@/lib/db/models/talent/PerformanceGoal";
import { logActivity } from "@/lib/logger";

// GET single performance goal
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const goal = await PerformanceGoal.findById(id)
            .populate("employee", "personalDetails employeeId");

        if (!goal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        return NextResponse.json(goal);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE performance goal (Progress, Status, Key Results)
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const goal = await PerformanceGoal.findById(id).populate("employee", "personalDetails");
        if (!goal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        // Update fields
        if (body.status) goal.status = body.status;
        if (body.progress !== undefined) goal.progress = body.progress;
        if (body.keyResults) goal.keyResults = body.keyResults;
        if (body.feedback) goal.feedback.push(body.feedback);

        await goal.save();

        // Log activity
        await logActivity({
            action: "updated",
            entity: "PerformanceGoal",
            entityId: goal._id,
            description: `Performance goal '${goal.title}' updated for ${goal.employee?.personalDetails?.firstName} (${goal.progress}%)`,
            performedBy: {
                userId: body.performedBy || goal.employee._id,
                name: "Sync System"
            },
            req: request
        });

        return NextResponse.json(goal);
    } catch (error) {
        console.error("Error in PUT /api/talent/goals/[id]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE a performance goal
export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const goal = await PerformanceGoal.findByIdAndDelete(id);
        if (!goal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Goal deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
