import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import CareerPath from "@/lib/db/models/talent/CareerPath";
import { z } from "zod";

const careerPathSchema = z.object({
    employeeId: z.string(),
    currentDesignation: z.string(),
    targetDesignation: z.string(),
    milestones: z.array(z.object({
        title: z.string(),
        status: z.enum(['Planned', 'In Progress', 'Achieved']),
        date: z.string(),
    })),
});

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        if (!employeeId) {
            return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
        }

        const careerPath = await CareerPath.findOne({ employee: employeeId });
        return NextResponse.json({ careerPath });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const validatedData = careerPathSchema.parse(body);

        const careerPath = await CareerPath.findOneAndUpdate(
            { employee: validatedData.employeeId },
            {
                employee: validatedData.employeeId,
                currentDesignation: validatedData.currentDesignation,
                targetDesignation: validatedData.targetDesignation,
                milestones: validatedData.milestones
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ careerPath, message: "Career path updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
