import Employee from "@/lib/db/models/payroll/Employee";
import WorkingShift from "@/lib/db/models/payroll/WorkingShift";
import HolidayList from "@/lib/db/models/payroll/HolidayList";
import Holiday from "@/lib/db/models/payroll/Holiday";
import RestrictedHolidayClaim from "@/lib/db/models/payroll/RestrictedHolidayClaim";

export async function calculateEffectiveLeaveDays(employeeId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize to UTC midnight to avoid local timezone offsets shifting dates
    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    if (startUTC > endUTC) {
        throw new Error("Start date must be before end date");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw new Error("Employee not found");
    }

    const orgId = employee.jobDetails?.organizationId;
    const officeId = employee.jobDetails?.assignedOfficeId;

    let shift = await WorkingShift.findOne({ organizationId: orgId, isDefault: true });
    const workingDays = shift && shift.workingDays && shift.workingDays.length > 0 
        ? shift.workingDays 
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    let holidayList = null;
    if (officeId) {
        holidayList = await HolidayList.findOne({ officeLocationId: officeId, isActive: true })
                                       .populate('holidays');
    }
    if (!holidayList && orgId) {
         holidayList = await HolidayList.findOne({ organizationId: orgId, isDefault: true, isActive: true })
                                        .populate('holidays');
    }

    const holidays = holidayList ? holidayList.holidays : [];
    const mandatoryHolidays = holidays.filter(h => !h.isRestricted && h.status === 'Active');

    const year = startUTC.getUTCFullYear();
    const claims = await RestrictedHolidayClaim.find({
        employeeId: employee._id,
        year: year,
        status: "Approved"
    }).populate('holidayId');

    const claimedHolidays = claims.map(c => c.holidayId);

    let currentDate = new Date(startUTC);
    const details = [];
    let totalEffectiveDays = 0;

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    while (currentDate <= endUTC) {
        const yyyy = currentDate.getUTCFullYear();
        const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const dayOfWeekName = dayNames[currentDate.getUTCDay()];
        
        let isDeductable = true;
        let reason = "Working Day";

        if (!workingDays.includes(dayOfWeekName)) {
            isDeductable = false;
            reason = "Weekend / Weekly Off";
        } else {
            const mandatoryMatch = mandatoryHolidays.find(h => {
                const hDate = new Date(h.date);
                return hDate.toISOString().split("T")[0] === dateStr;
            });

            if (mandatoryMatch) {
                isDeductable = false;
                reason = `Holiday: ${mandatoryMatch.name}`;
            } else {
                const claimMatch = claimedHolidays.find(h => {
                    if (!h || !h.date) return false;
                    const hDate = new Date(h.date);
                    return hDate.toISOString().split("T")[0] === dateStr;
                });

                if (claimMatch) {
                    isDeductable = false;
                    reason = `Claimed Holiday: ${claimMatch.name}`;
                }
            }
        }

        if (isDeductable) {
            totalEffectiveDays++;
        }

        details.push({
            date: dateStr,
            dayOfWeek: dayOfWeekName,
            isDeductable,
            reason
        });

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return {
        totalCalendarDays: details.length,
        totalEffectiveDays,
        details,
        shiftApplied: shift ? shift.name : "Default Standard Shift",
        workingDaysConfigured: workingDays
    };
}
