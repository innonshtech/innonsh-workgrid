import dbConnect from "@/lib/db/connect";
import ExitRequest from "@/lib/db/models/ExitRequest";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);

        await dbConnect();
        const { id } = await params;
        const exitRequest = await ExitRequest.findById(id).populate("employee", "personalDetails jobDetails");
        if (!exitRequest) {
            return NextResponse.json({ error: "Exit request not found" }, { status: 404 });
        }
        return NextResponse.json(exitRequest);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);

        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const exitRequest = await ExitRequest.findById(id);
        if (!exitRequest) {
            return NextResponse.json({ error: "Exit request not found" }, { status: 404 });
        }

        // Logic for Status Updates based on approvals
        // If Manager approves, status -> Manager_Approved
        if (body.outcome === "ManagerApprove") {
            exitRequest.managerApproval = {
                status: "Approved",
                approvedBy: body.approvedBy,
                approvalDate: new Date(),
                comments: body.comments
            };
            exitRequest.status = "Manager_Approved";
        } else if (body.outcome === "ManagerReject") {
            exitRequest.managerApproval = {
                status: "Rejected",
                approvedBy: body.approvedBy,
                approvalDate: new Date(),
                comments: body.comments
            };
            exitRequest.status = "Rejected";
        }

        // If HR approves (after Manager), status -> HR_Approved (or Completed/Processing?)
        // Let's say HR_Approved starts the clearance process
        if (body.outcome === "HRApprove") {
            exitRequest.hrApproval = {
                status: "Approved",
                approvedBy: body.approvedBy,
                approvalDate: new Date(),
                comments: body.comments
            };
            exitRequest.status = "HR_Approved";
        }

        // Clearance Updates
        if (body.clearanceType) { // e.g., 'it', 'finance', 'admin'
            exitRequest.clearanceStatus[body.clearanceType] = {
                status: body.status, // Cleared
                remarks: body.remarks,
                clearedBy: body.clearedBy,
                clearedDate: new Date()
            };
        }

        // Generic update fallback
        if (body.status && !body.outcome) {
            exitRequest.status = body.status;
        }

        // Save any other fields passed directly
        if (body.lastWorkingDate) exitRequest.lastWorkingDate = body.lastWorkingDate;
        if (body.fnfStatus) exitRequest.fnfStatus = body.fnfStatus;

        await exitRequest.save();

        return NextResponse.json(exitRequest);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
