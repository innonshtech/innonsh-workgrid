import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import Employee from "@/lib/db/models/payroll/Employee";
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

// GET - Fetch user notifications
export async function GET(req) {
    await dbConnect();
    const user = await getUserFromRequest(req);

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const employeeData = await Employee.findById(user.id);

        const query = {
            $or: [
                { audienceType: 'organization', organization: employeeData?.jobDetails?.organizationId },
                { audienceType: 'team', department: employeeData?.jobDetails?.departmentId },
                { audienceType: 'individual', $or: [{ employee: user.id }, { employees: user.id }] },
                // Fallback for legacy
                { audienceType: { $exists: false }, employee: user.id }
            ]
        };

        const notifications = await Notification.find(query)
            .populate('organization', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        const formattedNotifications = notifications.map(notification => ({
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            read: notification.readBy?.includes(user.id) || false,
            createdAt: notification.createdAt,
            organization: notification.organization?.name || null,
            details: notification.details
        }));

        return NextResponse.json({
            success: true,
            notifications: formattedNotifications
        });

    } catch (error) {
        console.error("Error fetching employee notifications:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// PUT - Mark as read
export async function PUT(req) {
    await dbConnect();
    const user = await getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { notificationId } = await req.json();

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }

        // We could verify if the user is in the audience, but if they have the ID, it's fine.
        if (!notification.readBy) {
            notification.readBy = [];
        }

        if (!notification.readBy.includes(user.id)) {
            notification.readBy.push(user.id);
            await notification.save();
        }

        return NextResponse.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
