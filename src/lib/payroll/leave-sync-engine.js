import mongoose from 'mongoose';
import { calculateEffectiveLeaveDays } from '@/lib/utils/leave-calculator';

/**
 * Sync Engine to bridge LeaveApplications with Payroll Leave Summaries
 * Ensures Holidays, Weekends, and Annual Quotas are respected.
 */
export async function syncLeaveApplicationToPayroll(applicationId) {
    try {
        const LeaveApplication = mongoose.model('LeaveApplication');
        const Leave = mongoose.model('Leave');
        const Employee = mongoose.model('Employee');

        // 1. Resolve Application and Employee
        const triggerApplication = await LeaveApplication.findById(applicationId);
        if (!triggerApplication) return;
        
        const employeeId = triggerApplication.employee;
        const employee = await Employee.findById(employeeId);
        if (!employee) return;

        console.log(`[LeaveSync] Total Refresh Triggered for ${employee.personalDetails?.firstName} (Due to application update)`);

        // 2. Fetch ALL approved applications for this employee in the current year
        const currentYear = new Date().getFullYear();
        const allApprovedApps = await LeaveApplication.find({
            employee: employeeId,
            status: { $regex: /^approved$/i }, // Case-insensitive match
            leaveType: { $ne: 'WFH' },
            $or: [
                { startDate: { $gte: new Date(currentYear, 0, 1) } },
                { endDate: { $gte: new Date(currentYear, 0, 1) } }
            ]
        });

        // 3. Extract and Deduplicate ALL Working Days
        const distinctDates = new Map(); // DateString -> { reason, type, approvedBy }

        for (const app of allApprovedApps) {
            console.log(`[LeaveSync] Processing App: ${app.leaveType} (${app.startDate.toDateString()} - ${app.endDate.toDateString()})`);
            const effectiveData = await calculateEffectiveLeaveDays(employeeId, app.startDate, app.endDate);
            console.log(`[LeaveSync]   Effective Days: ${effectiveData.totalEffectiveDays} / ${effectiveData.totalCalendarDays}`);
            
            effectiveData.details.forEach(day => {
                const dateKey = new Date(day.date).toISOString().split('T')[0];
                if (!day.isDeductable) {
                    console.log(`[LeaveSync]   SKIP: ${dateKey} (${day.reason})`);
                    return;
                }
                
                // Add to map (first one wins or we can prioritize)
                if (!distinctDates.has(dateKey)) {
                    console.log(`[LeaveSync]   ADD: ${dateKey}`);
                    distinctDates.set(dateKey, {
                        dateStr: dateKey,
                        reason: app.reason || 'Approved Leave',
                        leaveType: app.leaveType,
                        approvedBy: app.approvedBy,
                        approvedAt: app.approvedAt || app.createdAt
                    });
                }
            });
        }

        // 4. Group Distinct Dates by Month
        const monthlyGroups = {};
        distinctDates.forEach((info) => {
            const date = new Date(info.dateStr);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyGroups[key]) monthlyGroups[key] = [];
            monthlyGroups[key].push(info);
        });

        // 5. Process each month (Overwrite/Update records)
        const affectedMonths = Object.keys(monthlyGroups);
        
        for (const key of affectedMonths) {
            const [year, month] = key.split('-').map(Number);
            const items = monthlyGroups[key];
            
            let leaveRecord = await Leave.findOne({ employeeId, month, year });

            if (!leaveRecord) {
                leaveRecord = new Leave({
                    employeeId,
                    employeeCode: employee.employeeId,
                    employeeName: `${employee.personalDetails?.firstName} ${employee.personalDetails?.lastName}`,
                    organizationId: employee.jobDetails?.organizationId,
                    organizationType: employee.organizationType || 'Company',
                    department: employee.jobDetails?.department || 'General',
                    month,
                    year,
                    leaves: [],
                    status: 'Approved'
                });
            } else if (leaveRecord.status === 'Draft' || leaveRecord.leaves.length === 0) {
                // If it's a draft or empty, we allow the sync to upgrade it to Approved/Synced state
                leaveRecord.status = 'Approved'; 
                console.log(`[LeaveSync] Upgrading Draft record for ${employee.personalDetails?.firstName} in Month ${month}`);
            }

            // 5.1 PRE-RECONCILIATION PURGE
            // To ensure industry standards and accurate totals, we clear any existing data for this month
            // that doesn't match the new distinct set. This removes old placeholder or corrupted data.
            console.log(`[LeaveSync] Reconciling Month ${month}/${year}. Clearing existing ${leaveRecord.leaves.length} records.`);
            
            // Sync the leaves array precisely to the distinct set for this month
            // IMPORTANT: We map application types to valid payroll enum types ["Paid", "Unpaid"]
            const newLeavesItems = items.map(item => {
                const type = (item.leaveType || "").toLowerCase();
                let mappedType = "Paid"; // Default for Sick/Casual/Paid
                
                if (type.includes("unpaid")) {
                    mappedType = type.includes("half") ? "Half-Day Unpaid" : "Unpaid";
                } else {
                    mappedType = type.includes("half") ? "Half-Day Paid" : "Paid";
                }

                return {
                    date: new Date(item.dateStr),
                    leaveType: mappedType,
                    reason: item.reason,
                    approvedBy: item.approvedBy,
                    approvedAt: item.approvedAt
                };
            });

            // Force Overwrite
            leaveRecord.leaves = newLeavesItems;

            // Recalculate and Save
            leaveRecord.calculateSummary();
            await leaveRecord.save();
            console.log(`[LeaveSync] Reconciled: ${leaveRecord.summary.paidLeaves} Paid days for ${employee.personalDetails?.firstName}`);
        }

        // 6. Global Re-balance
        // Trigger a balance update for the first month record found to chain the YTD updates
        const sampleRecord = await Leave.findOne({ employeeId, year: currentYear });
        if (sampleRecord) {
            await sampleRecord.updateAnnualBalance();
        }

        console.log(`[LeaveSync] Successfully re-synced all ${allApprovedApps.length} applications for ${employee.personalDetails?.firstName}`);
    } catch (error) {
        console.error('[LeaveSync] Critical Error:', error);
        throw error;
    }
}
