import dbConnect from "@/lib/db/connect";
import ExitRequest from "@/lib/db/models/ExitRequest";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employee");
        const status = searchParams.get("status");

        let query = {};
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            // Future-proofing for SaaS scope
        }
        if (employeeId) query.employee = employeeId;
        if (status) query.status = status;

        const requests = await ExitRequest.find(query)
            .populate({
                path: "employee",
                select: "personalDetails.firstName personalDetails.lastName personalDetails.email jobDetails.department jobDetails.designation"
            })
            .sort({ createdAt: -1 });

        return NextResponse.json(requests);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);

        await dbConnect();
        const body = await request.json();

        if (!body.employee || !body.resignationDate || !body.lastWorkingDate || !body.reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if pending request exists
        const existing = await ExitRequest.findOne({
            employee: body.employee,
            status: { $in: ["Pending", "Manager_Approved", "HR_Approved"] }
        });

        if (existing) {
            return NextResponse.json({ error: "A pending resignation request already exists for this employee." }, { status: 400 });
        }

        const exitRequest = await ExitRequest.create(body);
        return NextResponse.json(exitRequest, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
