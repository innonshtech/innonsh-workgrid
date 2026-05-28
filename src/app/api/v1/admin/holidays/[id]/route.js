import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Holiday from "@/lib/db/models/payroll/Holiday";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function PUT(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const holiday = await Holiday.findById(id);
        if (!holiday) {
            return NextResponse.json({ success: false, error: "Holiday not found" }, { status: 404 });
        }

        // SaaS PROTECTION
        if (authUser.role === "admin" && holiday.organizationId?.toString() !== authUser.organizationId?.toString()) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }

        const updatedHoliday = await Holiday.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json({ success: true, holiday: updatedHoliday });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        await dbConnect();
        const { id } = await params;

        const holiday = await Holiday.findById(id);
        if (!holiday) {
            return NextResponse.json({ success: false, error: "Holiday not found" }, { status: 404 });
        }

        // SaaS PROTECTION
        if (authUser.role === "admin" && holiday.organizationId?.toString() !== authUser.organizationId?.toString()) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }

        await Holiday.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
