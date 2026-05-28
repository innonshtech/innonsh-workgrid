import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HolidayList from "@/lib/db/models/payroll/HolidayList";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request, { params }) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        
        const { id } = await params;
        const query = { _id: id };
        
        if (authUser.role === "admin" || authUser.role === "employee" || authUser.role === "supervisor") {
            query.organizationId = authUser.organizationId;
        }

        const holidayList = await HolidayList.findOne(query).populate('applicableLocations');
        if (!holidayList) return NextResponse.json({ success: false, error: "Holiday List not found" }, { status: 404 });

        return NextResponse.json({ success: true, holidayList });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        
        const query = { _id: id };
        if (authUser.role === "admin") {
            query.organizationId = authUser.organizationId;
        }

        if (body.isDefault) {
            // Unset other defaults for the same year and organization
            const list = await HolidayList.findById(id);
            await HolidayList.updateMany(
                { organizationId: list.organizationId, year: list.year, isDefault: true, _id: { $ne: id } },
                { isDefault: false }
            );
        }

        const holidayList = await HolidayList.findOneAndUpdate(
            query,
            { ...body, updatedBy: authUser.id },
            { new: true, runValidators: true }
        );

        if (!holidayList) return NextResponse.json({ success: false, error: "Holiday List not found or unauthorized" }, { status: 404 });

        return NextResponse.json({ success: true, holidayList });
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
        
        const query = { _id: id };
        if (authUser.role === "admin") {
            query.organizationId = authUser.organizationId;
        }

        const holidayList = await HolidayList.findOneAndDelete(query);
        if (!holidayList) return NextResponse.json({ success: false, error: "Holiday List not found or unauthorized" }, { status: 404 });

        // Optionally delete all associated holidays? 
        // Keka usually keeps them but marks them inactive or prompts. 
        // For simplicity, we'll keep them but they lose their reference list.

        return NextResponse.json({ success: true, message: "Holiday List deleted" });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
