import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import OvertimeRequest from "@/lib/db/models/payroll/OvertimeRequest";
import Attendance from "@/lib/db/models/payroll/Attendance";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        let query = {};
        
        // SaaS PROTECTION: Restrict by organization
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": authUser.organizationId 
            }).distinct("_id");
            query.employee = { $in: orgEmployees };
        } else if (authUser.role === "employee") {
            query.employee = authUser.id;
        }

        if (employeeId && authUser.role !== "employee") query.employee = employeeId;
        if (status) query.status = status;

        const requests = await OvertimeRequest.find(query)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name")
            .sort({ date: -1 });

        return NextResponse.json({ success: true, requests });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
        await dbConnect();
        const body = await request.json();
        const { employee, date, hours, reason } = body;

        if (!employee || !date || !hours || !reason) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        if (hours <= 0 || hours > 24) {
            return NextResponse.json({ success: false, error: "Hours must be between 1 and 24" }, { status: 400 });
        }

        // SaaS PROTECTION: Admin can only create OT for their org's employees
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            const targetEmployee = await Employee.findById(employee);
            if (!targetEmployee) {
                return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
            }
            if (authUser.role === "admin" && targetEmployee.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
                return NextResponse.json({ success: false, error: "Forbidden: Employee not in your organization" }, { status: 403 });
            }
        }

        const newRequest = await OvertimeRequest.create({
            employee,
            date: new Date(date),
            hours,
            reason,
            status: 'Pending'
        });

        return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
