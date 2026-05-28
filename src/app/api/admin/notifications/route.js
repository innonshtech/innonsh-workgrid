import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceThreshold from "@/lib/db/models/payroll/AttendanceThreshold";
import DocumentReminder from "@/lib/db/models/payroll/DocumentReminder";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import Employee from "@/lib/db/models/payroll/Employee";

// GET - Fetch notifications
export async function GET(request) {
  try {
    await dbConnect();

    // Fetch real notifications from database
    const notifications = await Notification.find()
      .populate('organization', 'name')
      .populate('employee', 'personalDetails employeeId')
      .sort({ createdAt: -1 })
      .limit(50);

    // Format notifications for frontend
    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      read: notification.read,
      createdAt: notification.createdAt,
      organization: notification.organization?.name || null,
      details: notification.details
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Mark notification as read
export async function PUT(request) {
  try {
    await dbConnect();
    const { notificationId } = await request.json();

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}