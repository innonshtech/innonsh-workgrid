import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import PerformanceGoal from "@/lib/db/models/talent/PerformanceGoal";
import Employee from "@/lib/db/models/payroll/Employee";
import { logActivity } from "@/lib/logger";

// GET performance goals
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        let filter = {};
        if (employeeId) filter.employee = employeeId;
        if (status) filter.status = status;

        const goals = await PerformanceGoal.find(filter)
            .populate("employee", "personalDetails employeeId")
            .sort({ createdAt: -1 });

        return NextResponse.json({ goals });
    } catch (error) {
        console.error("Error in GET /api/talent/goals:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CREATE a new performance goal
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            employeeId,
            title,
            description,
            category,
            startDate,
            endDate,
            priority,
            keyResults
        } = body;

        if (!employeeId || !title || !startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const goal = await PerformanceGoal.create({
            employee: employeeId,
            title,
            description,
            category,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            priority,
            keyResults: keyResults || []
        });

        const employee = await Employee.findById(employeeId);

        // Log activity
        await logActivity({
            action: "created",
            entity: "PerformanceGoal",
            entityId: goal._id,
            description: `New performance goal '${title}' set for ${employee?.personalDetails?.firstName}`,
            performedBy: {
                userId: body.performedBy || employeeId, // Admin or Employee
                name: "Sync System"
            },
            req: request
        });

        return NextResponse.json(goal, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/talent/goals:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
