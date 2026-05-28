import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Bonus from "@/lib/db/models/payroll/Bonus";
import Employee from "@/lib/db/models/payroll/Employee";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromRequest(req) {
    const token = req.cookies.get("authToken")?.value || req.cookies.get("employee_token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function PUT(req, { params }) {
    await dbConnect();
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        const bonus = await Bonus.findById(id);
        if (!bonus) {
            return NextResponse.json({ message: "Bonus not found" }, { status: 404 });
        }

        if (status) {
            bonus.status = status;
            if (status === 'Approved') {
                bonus.approvedBy = user.id;
            }
        }

        await bonus.save();

        // --- Notification Logic on Status Change ---
        if (status === 'Approved' || status === 'Paid' || status === 'Rejected') {
            let targetEmployeeIds = [];

            if (bonus.targetAudience === 'Individual') {
                targetEmployeeIds = bonus.employees;
            } else if (bonus.targetAudience === 'Department') {
                const departmentEmployees = await Employee.find({ 'jobDetails.departmentId': bonus.department }).select('_id');
                targetEmployeeIds = departmentEmployees.map(e => e._id);
            } else if (bonus.targetAudience === 'All') {
                const allEmployees = await Employee.find({}).select('_id');
                targetEmployeeIds = allEmployees.map(e => e._id);
            }

            if (targetEmployeeIds.length > 0) {
                const notifications = targetEmployeeIds.map(empId => ({
                    type: 'bonus',
                    title: `Bonus Update: ${bonus.title}`,
                    message: `Your bonus status has been updated to: ${status}.`,
                    priority: status === 'Paid' ? 'high' : 'medium',
                    employee: empId,
                    details: {
                        bonusId: bonus._id,
                        status: status,
                        actionDate: new Date()
                    }
                }));

                await Notification.insertMany(notifications);
            }
        }
        // -------------------------------------------

        return NextResponse.json({ message: "Bonus updated successfully", bonus });

    } catch (error) {
        console.error("Error updating bonus:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    await dbConnect();
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const bonus = await Bonus.findById(id);

        if (!bonus) {
            return NextResponse.json({ message: "Bonus not found" }, { status: 404 });
        }

        if (bonus.status !== 'Pending') {
            return NextResponse.json({ message: "Cannot delete processed bonus" }, { status: 400 });
        }

        await Bonus.findByIdAndDelete(id);

        // Optional: Notify deletion? Usually not needed if it was just Pending.

        return NextResponse.json({ message: "Bonus deleted successfully" });

    } catch (error) {
        console.error("Error deleting bonus:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
