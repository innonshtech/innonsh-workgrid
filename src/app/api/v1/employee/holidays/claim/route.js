import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HolidayList from "@/lib/db/models/payroll/HolidayList";
import Holiday from "@/lib/db/models/payroll/Holiday";
import Employee from "@/lib/db/models/payroll/Employee";
import RestrictedHolidayClaim from "@/lib/db/models/payroll/RestrictedHolidayClaim";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        // Allow employee roles and supervisor
        authorize(authUser, ["employee", "attendance_only", "supervisor", "admin"]);

        await dbConnect();
        const body = await request.json();
        const { holidayId, employeeId: requestedEmployeeId } = body;

        if (!holidayId) {
            return NextResponse.json({ success: false, error: "Holiday ID is required" }, { status: 400 });
        }

        // Allow admins to claim on behalf of employees
        let employeeId = authUser.id;
        if ((authUser.role === "admin" || authUser.role === "supervisor") && requestedEmployeeId) {
            employeeId = requestedEmployeeId;
        }

        const employee = await Employee.findById(employeeId).lean();
        if (!employee) {
             return NextResponse.json({ success: false, error: "Employee record not found" }, { status: 404 });
        }

        const holiday = await Holiday.findById(holidayId).lean();
        if (!holiday || !holiday.isRestricted) {
             return NextResponse.json({ success: false, error: "Invalid or non-restricted holiday" }, { status: 400 });
        }

        const holidayListId = holiday.holidayListId;
        const holidayList = await HolidayList.findById(holidayListId).lean();
        
        if (!holidayList) {
             return NextResponse.json({ success: false, error: "Holiday list not found" }, { status: 404 });
        }

        const quota = holidayList.restrictedHolidayCount || 0;
        const year = holidayList.year || new Date(holiday.date).getFullYear();

        // Check if already claimed
        const existingClaim = await RestrictedHolidayClaim.findOne({
            employeeId: employee._id,
            holidayId: holiday._id
        });

        if (existingClaim) {
            return NextResponse.json({ success: false, error: "You have already claimed this holiday" }, { status: 400 });
        }

        // Check quota usages
        const currentClaimsCount = await RestrictedHolidayClaim.countDocuments({
            employeeId: employee._id,
            year: year,
            status: { $ne: "Rejected" }
        });

        if (currentClaimsCount >= quota) {
            return NextResponse.json({ 
                success: false, 
                error: `Quota exceeded. You can only claim ${quota} optional holiday(s) this year.` 
            }, { status: 400 });
        }

        // Create Claim
        const newClaim = await RestrictedHolidayClaim.create({
            employeeId: employee._id,
            organizationId: employee.jobDetails.organizationId,
            holidayId: holiday._id,
            holidayListId: holidayList._id,
            date: holiday.date,
            year: year,
            status: "Approved" // Auto-approve as per your request
        });

        return NextResponse.json({
            success: true,
            claim: newClaim,
            message: "Holiday successfully claimed"
        });

    } catch (error) {
        console.error("Employee Holiday claim POST error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const authUser = await getAuthUser();
        // Allow employee roles and supervisor
        authorize(authUser, ["employee", "attendance_only", "supervisor", "admin"]);

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const claimId = searchParams.get("id");

        if (!claimId) {
             return NextResponse.json({ success: false, error: "Claim ID is required" }, { status: 400 });
        }

        const claim = await RestrictedHolidayClaim.findById(claimId);
        if (!claim) {
             return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
        }

        // Check authorization to delete (must be owner or admin)
        if (authUser.role !== "admin" && authUser.role !== "supervisor" && claim.employeeId.toString() !== authUser.id.toString()) {
            return NextResponse.json({ success: false, error: "Unauthorized to delete this claim" }, { status: 403 });
        }
        
        // Cannot cancel past holidays
        const holidayDate = new Date(claim.date);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (holidayDate < today && authUser.role !== "admin") {
             return NextResponse.json({ success: false, error: "Cannot un-claim past holidays" }, { status: 400 });
        }

        await claim.deleteOne();

        return NextResponse.json({
            success: true,
            message: "Holiday claim cancelled"
        });

    } catch (error) {
        console.error("Employee Holiday claim DELETE error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
