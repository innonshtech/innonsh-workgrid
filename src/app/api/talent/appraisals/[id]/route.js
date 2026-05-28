import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Appraisal from "@/lib/db/models/talent/Appraisal";
import { logActivity } from "@/lib/logger";

// GET single appraisal
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const appraisal = await Appraisal.findById(id)
            .populate("employee", "personalDetails employeeId")
            .populate("manager", "name email");

        if (!appraisal) {
            return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
        }

        return NextResponse.json(appraisal);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE appraisal (Ratings, Comments, Status)
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const appraisal = await Appraisal.findById(id).populate("employee", "personalDetails");
        if (!appraisal) {
            return NextResponse.json({ error: "Appraisal not found" }, { status: 404 });
        }

        // Update fields
        if (body.status) appraisal.status = body.status;
        if (body.selfRatings) appraisal.selfRatings = body.selfRatings;
        if (body.managerRatings) appraisal.managerRatings = body.managerRatings;
        if (body.peerRatings) appraisal.peerRatings = body.peerRatings;
        if (body.overallScore !== undefined) appraisal.overallScore = body.overallScore;
        if (body.employeeStrengths) appraisal.employeeStrengths = body.employeeStrengths;
        if (body.improvementAreas) appraisal.improvementAreas = body.improvementAreas;
        if (body.employeeComments) appraisal.employeeComments = body.employeeComments;
        if (body.managerComments) appraisal.managerComments = body.managerComments;
        if (body.finalReviewDate) appraisal.finalReviewDate = new Date(body.finalReviewDate);

        await appraisal.save();

        // Log activity
        await logActivity({
            action: "updated",
            entity: "Appraisal",
            entityId: appraisal._id,
            description: `Appraisal for ${appraisal.employee?.personalDetails?.firstName} updated to ${appraisal.status}`,
            performedBy: {
                userId: body.performedBy || appraisal.manager,
                name: "Admin"
            },
            req: request
        });

        return NextResponse.json(appraisal);
    } catch (error) {
        console.error("Error in PUT /api/talent/appraisals/[id]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
