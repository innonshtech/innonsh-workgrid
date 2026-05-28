import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HolidayList from "@/lib/db/models/payroll/HolidayList";
import Holiday from "@/lib/db/models/payroll/Holiday";
import Employee from "@/lib/db/models/payroll/Employee";
import RestrictedHolidayClaim from "@/lib/db/models/payroll/RestrictedHolidayClaim";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        // Allow employee roles, and supervisor
        authorize(authUser, ["employee", "attendance_only", "supervisor", "admin"]);

        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const year = searchParams.get("year") || new Date().getFullYear();
        let employeeId = authUser.id; // Usually token ID holds employee ID
        
        // Admins can view holidays for a specific employee if passed
        if ((authUser.role === "admin" || authUser.role === "supervisor") && searchParams.get("employeeId")) {
            employeeId = searchParams.get("employeeId");
        }

        const employee = await Employee.findById(employeeId).lean();
        if (!employee) {
             return NextResponse.json({ success: false, error: "Employee record not found" }, { status: 404 });
        }

        const empOrgId = employee.jobDetails?.organizationId;
        const empOfficeId = employee.jobDetails?.assignedOfficeId;
        let empHolidayListId = employee.jobDetails?.holidayListId;

        // AUTO-RESOLVE: Find holiday list from employee's branch/office location
        if (!empHolidayListId && empOfficeId) {
            const listForOffice = await HolidayList.findOne({
                applicableLocations: empOfficeId,
                year: Number(year),
                status: 'Active'
            }).lean();
            if (listForOffice) empHolidayListId = listForOffice._id;
        }

        // FALLBACK: Default list for org
        if (!empHolidayListId && empOrgId) {
            const defaultList = await HolidayList.findOne({
                organizationId: empOrgId,
                year: Number(year),
                isDefault: true,
                status: 'Active'
            }).lean();
            if (defaultList) empHolidayListId = defaultList._id;
        }

        // If no list resolved, they have no specific list set
        if (!empHolidayListId) {
             return NextResponse.json({ 
                 success: true, 
                 holidayList: null, 
                 mandatoryHolidays: [], 
                 restrictedHolidays: [],
                 claims: [] 
             });
        }

        const holidayList = await HolidayList.findById(empHolidayListId).lean();

        // Fetch all holidays for this list
        const holidays = await Holiday.find({
            holidayListId: empHolidayListId,
            status: "Active"
        }).sort({ date: 1 }).lean();

        // Separate them
        const mandatoryHolidays = holidays.filter(h => !h.isRestricted);
        const restrictedHolidays = holidays.filter(h => h.isRestricted);

        // Fetch existing claims for the employee for this year
        const claims = await RestrictedHolidayClaim.find({
            employeeId: employeeId,
            year: Number(year)
        }).lean();

        return NextResponse.json({
            success: true,
            holidayList,
            mandatoryHolidays,
            restrictedHolidays,
            claims,
            quota: holidayList.restrictedHolidayCount || 0
        });

    } catch (error) {
        console.error("Employee Holidays fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
