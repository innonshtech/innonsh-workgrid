import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Holiday from "@/lib/db/models/payroll/Holiday";

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = params;
        const body = await request.json();

        const holiday = await Holiday.findByIdAndUpdate(id, body, { new: true });
        if (!holiday) {
            return NextResponse.json({ success: false, error: "Holiday not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, holiday });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = params;

        const holiday = await Holiday.findByIdAndDelete(id);
        if (!holiday) {
            return NextResponse.json({ success: false, error: "Holiday not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
