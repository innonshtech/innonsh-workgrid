import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import ShiftRoster from "@/lib/db/models/payroll/ShiftRoster";
import WorkingShift from "@/lib/db/models/payroll/WorkingShift";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const organizationId = searchParams.get("organizationId");
        const employeeId = searchParams.get("employeeId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const filter = {};
        
        // SaaS PROTECTION: Restrict by organization
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            filter.organizationId = authUser.organizationId;
        } else if (authUser.role === "employee") {
            filter.employeeId = authUser.id;
        } else if (authUser.role === "super_admin" && organizationId) {
            filter.organizationId = organizationId;
        }

        if (employeeId && authUser.role !== "employee") {
            filter.employeeId = employeeId;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const roster = await ShiftRoster.find(filter)
            .populate("shiftId")
            .populate("employeeId", "personalDetails employeeId")
            .sort({ date: 1 });

        return NextResponse.json({ success: true, roster });
    } catch (error) {
        console.error("GET Roster Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const body = await req.json();
        const { assignments, assignedBy } = body;
        let { organizationId } = body;

        // SaaS PROTECTION: Admin must use their assigned organizationId
        if (authUser.role === "admin") {
            organizationId = authUser.organizationId;
        }

        if (!assignments || !Array.isArray(assignments)) {
            return NextResponse.json({ success: false, error: "Assignments array is required" }, { status: 400 });
        }

        if (!organizationId) {
            return NextResponse.json({ success: false, error: "Organization ID is required" }, { status: 400 });
        }

        const results = [];
        for (const assignment of assignments) {
            const { employeeId, date, shiftId } = assignment;

            // Security check: Ensure employee belongs to the organization
            const employee = await Employee.findById(employeeId);
            if (!employee || employee.jobDetails?.organizationId?.toString() !== organizationId.toString()) {
                continue; // Skip invalid assignments
            }

            const updated = await ShiftRoster.findOneAndUpdate(
                { employeeId, date: new Date(date) },
                {
                    shiftId,
                    organizationId,
                    assignedBy: assignedBy || authUser.id,
                    status: "Published"
                },
                { upsert: true, new: true }
            );
            results.push(updated);
        }

        return NextResponse.json({ success: true, count: results.length, roster: results });
    } catch (error) {
        console.error("POST Roster Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const employeeId = searchParams.get("employeeId");
        const date = searchParams.get("date");

        if (id) {
            const existing = await ShiftRoster.findById(id);
            if (existing && authUser.role === "admin" && existing.organizationId?.toString() !== authUser.organizationId) {
                return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
            }
            await ShiftRoster.findByIdAndDelete(id);
        } else if (employeeId && date) {
            const filter = { employeeId, date: new Date(date) };
            if (authUser.role === "admin") {
                filter.organizationId = authUser.organizationId;
            }
            await ShiftRoster.findOneAndDelete(filter);
        } else {
            return NextResponse.json({ success: false, error: "ID or EmployeeId & Date required" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Assignment removed" });
    } catch (error) {
        console.error("DELETE Roster Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
