import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import LeaveApplication from "@/lib/db/models/payroll/LeaveApplication";
import Employee from "@/lib/db/models/payroll/Employee";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

// GET leave applications
export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        let filter = {};
        
        // SaaS PROTECTION: Restrict by organization
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": authUser.organizationId 
            }).distinct("_id");
            filter.employee = { $in: orgEmployees };
        } else if (authUser.role === "employee") {
            filter.employee = authUser.id;
        }

        if (employeeId && authUser.role !== "employee") filter.employee = employeeId;
        if (status) filter.status = status;

        const applications = await LeaveApplication.find(filter)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        return NextResponse.json({ applications });
    } catch (error) {
        console.error("Error in GET /api/payroll/leave-applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// SUBMIT a new leave application
export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const body = await request.json();
        const {
            employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments
        } = body;

        if (!employeeId || !leaveType || !startDate || !endDate || !totalDays || !reason) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const application = await LeaveApplication.create({
            employee: employeeId,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalDays,
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments: attachments || [],
            status: "Pending"
        });

        const employee = await Employee.findById(employeeId);

        // Log activity
        await logActivity({
            action: "created",
            entity: "LeaveApplication",
            entityId: application._id,
            description: `New leave application from ${employee?.personalDetails?.firstName || 'Employee'} (${totalDays} days)`,
            performedBy: {
                userId: employeeId,
                name: `${employee?.personalDetails?.firstName} ${employee?.personalDetails?.lastName}`
            },
            req: request
        });

        return NextResponse.json(application, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/payroll/leave-applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
