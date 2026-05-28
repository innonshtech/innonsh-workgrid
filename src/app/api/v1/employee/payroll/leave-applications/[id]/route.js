import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import LeaveApplication from "@/lib/db/models/payroll/LeaveApplication";
import { logActivity } from "@/lib/logger";

// GET single leave application
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const application = await LeaveApplication.findById(id)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name email");

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        return NextResponse.json(application);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE leave application status (Approve/Reject)
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { status, rejectionReason, approvedBy } = body;

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const application = await LeaveApplication.findById(id).populate("employee", "personalDetails");
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        application.status = status;
        if (status === 'Rejected') {
            application.rejectionReason = rejectionReason;
        }
        application.approvedBy = approvedBy;
        application.approvedAt = new Date();

        await application.save();

        // Log activity
        await logActivity({
            action: status.toLowerCase(),
            entity: "LeaveApplication",
            entityId: application._id,
            description: `Leave application for ${application.employee?.personalDetails?.firstName} was ${status.toLowerCase()}`,
            performedBy: {
                userId: approvedBy,
                name: "Admin" // You can pass actual name in body if needed
            },
            details: { rejectionReason },
            req: request
        });

        return NextResponse.json(application);
    } catch (error) {
        console.error("Error in PUT /api/payroll/leave-applications/[id]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
