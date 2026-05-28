import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import CompOffRequest from "@/lib/db/models/payroll/CompOffRequest";
import Employee from "@/lib/db/models/payroll/Employee";

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");

        let query = {};
        if (employeeId) query.employee = employeeId;
        if (status) query.status = status;

        const requests = await CompOffRequest.find(query)
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
        await dbConnect();
        const body = await request.json();
        const { employee, date, type, days, reason } = body;

        if (!employee || !date || !type || !days || !reason) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // For "Use" request, check balance
        if (type === 'Use') {
            const emp = await Employee.findById(employee);
            if (!emp || (emp.compOffBalance || 0) < days) {
                return NextResponse.json({ success: false, error: "Insufficient C-Off balance" }, { status: 400 });
            }
        }

        const newRequest = await CompOffRequest.create({
            employee,
            date: new Date(date),
            type,
            days,
            reason,
            status: 'Pending'
        });

        return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
