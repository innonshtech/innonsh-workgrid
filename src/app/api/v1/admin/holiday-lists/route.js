import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HolidayList from "@/lib/db/models/payroll/HolidayList";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");
        const year = searchParams.get("year");

        let query = { status: 'Active' };
        
        if (authUser.role === "admin" || authUser.role === "employee" || authUser.role === "supervisor") {
            query.organizationId = authUser.organizationId;
        } else if (organizationId) {
            query.organizationId = organizationId;
        }

        if (year) {
            query.year = Number(year);
        }

        const holidayLists = await HolidayList.find(query)
            .populate('applicableLocations')
            .sort({ isDefault: -1, name: 1 })
            .lean();

        // Aggregate holiday counts per list
        const Holiday = (await import("@/lib/db/models/payroll/Holiday")).default;
        for (const list of holidayLists) {
            const totalCount = await Holiday.countDocuments({ holidayListId: list._id, status: 'Active' });
            const restrictedCount = await Holiday.countDocuments({ holidayListId: list._id, status: 'Active', isRestricted: true });
            list.holidayCount = totalCount;
            list.restrictedCount = restrictedCount;
        }

        return NextResponse.json({ success: true, holidayLists });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();
        
        if (authUser.role === "admin") {
            body.organizationId = authUser.organizationId;
        }

        if (body.isDefault) {
            // Unset other defaults for the same year and organization
            await HolidayList.updateMany(
                { organizationId: body.organizationId, year: body.year, isDefault: true },
                { isDefault: false }
            );
        }

        const holidayList = await HolidayList.create({
            ...body,
            createdBy: authUser.id
        });

        return NextResponse.json({ success: true, holidayList }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
