import dbConnect from "@/lib/db/connect";
import ExitRequest from "@/lib/db/models/ExitRequest";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["employee"]);

        await dbConnect();
        const { id } = params;

        const exitRequest = await ExitRequest.findOne({ _id: id, employee: authUser.id })
            .populate("employee", "personalDetails jobDetails");

        if (!exitRequest) {
            return NextResponse.json({ error: "Exit request not found" }, { status: 404 });
        }

        return NextResponse.json(exitRequest);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
