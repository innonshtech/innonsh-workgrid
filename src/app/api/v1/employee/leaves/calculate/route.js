import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import { calculateEffectiveLeaveDays } from "@/lib/utils/leave-calculator";

export async function POST(request) {
    try {
        await dbConnect();
        const { employeeId, startDate, endDate, leaveType } = await request.json();

        if (!employeeId || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Robust Profile Resolution
        let resolvedEmployeeId = employeeId;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return NextResponse.json({ error: "Invalid employee ID format" }, { status: 400 });
        }

        const employeeCheck = await Employee.findById(employeeId);
        if (!employeeCheck) {
            // Check if this is a User ID instead
            const User = mongoose.models.User || mongoose.model('User');
            const user = await User.findById(employeeId);
            if (user && user.employeeId) {
                const actualEmp = await Employee.findOne({ employeeId: user.employeeId });
                if (actualEmp) resolvedEmployeeId = actualEmp._id;
            }
        }

        const result = await calculateEffectiveLeaveDays(resolvedEmployeeId, startDate, endDate);

        if (leaveType === 'WFH') {
            result.totalEffectiveDays = 0;
            if (result.details) {
                result.details = result.details.map(d => ({
                    ...d,
                    isDeductable: false,
                    reason: 'Work From Home'
                }));
            }
        } else if (leaveType === 'Half Day') {
            result.totalEffectiveDays = result.totalEffectiveDays * 0.5;
            if (result.details) {
                result.details = result.details.map(d => ({
                    ...d,
                    reason: d.isDeductable ? 'Half Day Leave' : d.reason
                }));
            }
        }

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error("Error calculating leave duration:", error);
        return NextResponse.json({ error: error.message }, { status: error.message === "Employee not found" ? 404 : 500 });
    }
}
