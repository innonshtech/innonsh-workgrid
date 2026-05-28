import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Appraisal from "@/lib/db/models/talent/Appraisal";
import { logActivity } from "@/lib/logger";

// GET appraisals
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        let filter = {};
        if (employeeId) filter.employee = employeeId;
        if (status) filter.status = status;

        const appraisals = await Appraisal.find(filter)
            .populate("employee", "personalDetails employeeId")
            .populate("manager", "name")
            .sort({ createdAt: -1 });

        return NextResponse.json({ appraisals });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CREATE a new appraisal cycle/document
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            employeeId,
            managerId,
            period,
            startDate,
            endDate
        } = body;

        if (!employeeId || !managerId || !period) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const appraisal = await Appraisal.create({
            employee: employeeId,
            manager: managerId,
            period,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status: 'Self-Appraisal'
        });

        // Log activity
        await logActivity({
            action: "created",
            entity: "Appraisal",
            entityId: appraisal._id,
            description: `New appraisal cycle '${period}' started for employee`,
            performedBy: {
                userId: managerId,
                name: "Admin"
            },
            req: request
        });

        return NextResponse.json(appraisal, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
