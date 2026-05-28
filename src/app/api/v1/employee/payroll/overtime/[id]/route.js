import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import OvertimeRequest from "@/lib/db/models/payroll/OvertimeRequest";
import Attendance from "@/lib/db/models/payroll/Attendance";

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = params;
        const body = await request.json();
        const { status, adminNotes, approvedBy } = body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
        }

        const otRequest = await OvertimeRequest.findById(id);
        if (!otRequest) {
            return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
        }

        otRequest.status = status;
        otRequest.adminNotes = adminNotes;
        otRequest.approvedBy = approvedBy;
        otRequest.approvedAt = new Date();

        if (status === 'Approved') {
            // Sync with Attendance record
            const startOfDay = new Date(otRequest.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(otRequest.date);
            endOfDay.setHours(23, 59, 59, 999);

            let attendance = await Attendance.findOne({
                employee: otRequest.employee,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (attendance) {
                attendance.overtimeHours = (attendance.overtimeHours || 0) + otRequest.hours;
                await attendance.save();
            } else {
                // Create a placeholder attendance record for the OT
                await Attendance.create({
                    employee: otRequest.employee,
                    date: otRequest.date,
                    status: 'Present', // Or could be 'Weekend'/'Holiday' if logic permits
                    overtimeHours: otRequest.hours,
                    notes: `Overtime approved: ${otRequest.reason}`
                });
            }
        }

        await otRequest.save();

        return NextResponse.json({ success: true, request: otRequest });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
