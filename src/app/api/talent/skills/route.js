import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Skill from "@/lib/db/models/talent/Skill";
import { logActivity } from "@/lib/logger";

// GET skills
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const category = searchParams.get("category");

        let filter = {};
        if (employeeId) filter.employee = employeeId;
        if (category) filter.category = category;

        const skills = await Skill.find(filter)
            .populate("employee", "personalDetails employeeId")
            .sort({ proficiency: -1 });

        return NextResponse.json({ skills });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPSERT a skill (Add or Update proficiency)
export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            employeeId,
            name,
            category,
            proficiency
        } = body;

        if (!employeeId || !name || !proficiency) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const skill = await Skill.findOneAndUpdate(
            { employee: employeeId, name },
            { category, proficiency, lastAssessed: new Date() },
            { new: true, upsert: true }
        );

        // Log activity
        await logActivity({
            action: "updated",
            entity: "Skill",
            entityId: skill._id,
            description: `Skill '${name}' proficiency set to ${proficiency}/5 for employee`,
            performedBy: {
                userId: employeeId,
                name: "Sync System"
            },
            req: request
        });

        return NextResponse.json(skill);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
