import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import CompOffRequest from "@/lib/db/models/payroll/CompOffRequest";
import Employee from "@/lib/db/models/payroll/Employee";

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { status, adminNotes, approvedBy } = body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
        }

        const coRequest = await CompOffRequest.findById(id);
        if (!coRequest) {
            return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
        }

        if (coRequest.status !== 'Pending') {
            return NextResponse.json({ success: false, error: "Request already processed" }, { status: 400 });
        }

        coRequest.status = status;
        coRequest.adminNotes = adminNotes;
        coRequest.approvedBy = approvedBy;
        coRequest.approvedAt = new Date();

        if (status === 'Approved') {
            const employee = await Employee.findById(coRequest.employee);
            if (!employee) throw new Error("Employee not found");

            if (coRequest.type === 'Earn') {
                employee.compOffBalance = (employee.compOffBalance || 0) + coRequest.days;
            } else if (coRequest.type === 'Use') {
                if ((employee.compOffBalance || 0) < coRequest.days) {
                    return NextResponse.json({ success: false, error: "Insufficient balance at time of approval" }, { status: 400 });
                }
                employee.compOffBalance -= coRequest.days;
            }
            await employee.save();
        }

        await coRequest.save();

        return NextResponse.json({ success: true, request: coRequest });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
