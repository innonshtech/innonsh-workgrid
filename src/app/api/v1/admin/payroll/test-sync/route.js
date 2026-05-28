import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import mongoose from "mongoose";
import { syncLeaveApplicationToPayroll } from "@/lib/payroll/leave-sync-engine";

export async function GET() {
    try {
        await dbConnect();
        require("@/lib/db/models/payroll/LeaveApplication");
        require("@/lib/db/models/payroll/Employee");
        require("@/lib/db/models/payroll/Leave");

        const LeaveApplication = mongoose.model("LeaveApplication");
        const Employee = mongoose.model("Employee");
        const Leave = mongoose.model("Leave");

        const lokeek = await Employee.findOne({ "personalDetails.firstName": "Lokeek" });
        if (!lokeek) return NextResponse.json({ error: "Lokeek not found" });

        const apps = await LeaveApplication.find({ employee: lokeek._id, status: { $regex: /^approved$/i } });
        
        let syncStatus = "No apps found";
        if (apps.length > 0) {
            await syncLeaveApplicationToPayroll(apps[0]._id);
            syncStatus = "Sync triggered successfully";
        }

        const leaves = await Leave.find({ employeeId: lokeek._id }).sort({ month: 1 });
        return NextResponse.json({
            syncStatus,
            appsCount: apps.length,
            apps: apps.map(a => ({ start: a.startDate, end: a.endDate, type: a.leaveType, status: a.status })),
            leaves: leaves.map(l => ({
                month: l.month,
                status: l.status,
                summary: l.summary,
                used: l.annualLeaveBalance?.used || 0,
                remaining: l.annualLeaveBalance?.remaining || 0,
                leavesCount: l.leaves.length
            }))
        });
    } catch (e) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
