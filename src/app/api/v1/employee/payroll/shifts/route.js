import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import WorkingShift from "@/lib/db/models/payroll/WorkingShift";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const organizationId = searchParams.get("organizationId");
        const status = searchParams.get("status") || "Active";

        const filter = { status };
        
        // SaaS PROTECTION: Restrict by organization
        if (authUser.role === "admin" || authUser.role === "supervisor" || authUser.role === "employee") {
            filter.organizationId = authUser.organizationId;
        } else if (authUser.role === "super_admin" && organizationId) {
            filter.organizationId = organizationId;
        }

        const shifts = await WorkingShift.find(filter).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, shifts });
    } catch (error) {
        console.error("GET Shifts Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const data = await req.json();

        // SaaS PROTECTION: Admin must use their assigned organizationId
        if (authUser.role === "admin") {
            data.organizationId = authUser.organizationId;
        }

        if (!data.organizationId) {
            return NextResponse.json({ success: false, error: "Organization ID is required" }, { status: 400 });
        }

        // If setting as default, unset other default shifts in same organization
        if (data.isDefault) {
            await WorkingShift.updateMany(
                { organizationId: data.organizationId, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        const shift = await WorkingShift.create(data);
        return NextResponse.json({ success: true, shift });
    } catch (error) {
        console.error("POST Shift Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const data = await req.json();
        const { _id, ...updateData } = data;

        if (!_id) {
            return NextResponse.json({ success: false, error: "Shift ID is required" }, { status: 400 });
        }

        const existing = await WorkingShift.findById(_id);
        if (!existing) {
            return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
        }

        // SaaS PROTECTION: Admin can only update their own org's shifts
        if (authUser.role === "admin" && existing.organizationId?.toString() !== authUser.organizationId) {
            return NextResponse.json({ success: false, error: "Forbidden: Cannot edit another organization's shift" }, { status: 403 });
        }

        // If setting as default, unset other default shifts in same organization
        if (updateData.isDefault) {
            await WorkingShift.updateMany(
                { organizationId: existing.organizationId, isDefault: true, _id: { $ne: _id } },
                { $set: { isDefault: false } }
            );
        }

        const shift = await WorkingShift.findByIdAndUpdate(_id, updateData, { new: true });
        return NextResponse.json({ success: true, shift });
    } catch (error) {
        console.error("PUT Shift Error:", error);
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

        if (!id) {
            return NextResponse.json({ success: false, error: "Shift ID is required" }, { status: 400 });
        }

        const existing = await WorkingShift.findById(id);
        if (!existing) {
             return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 });
        }

        // SaaS PROTECTION: Admin can only delete their own org's shifts
        if (authUser.role === "admin" && existing.organizationId?.toString() !== authUser.organizationId) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        await WorkingShift.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: "Shift deleted successfully" });
    } catch (error) {
        console.error("DELETE Shift Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
