import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import Employee from "@/lib/db/models/payroll/Employee";
import { sendEmail } from "@/lib/email/service";
import { getSystemNotificationTemplate } from "@/lib/email/templates";
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
        let query = {};

        if (user.role === 'admin') {
            // Admin sees all? Or just theirs? 
            // Usually admin dashboard shows system alerts. 
            // For now, let's keep admin seeing *all* notifications if that was the intent,
            // OR allow admin to see notifications targeted at them if we had admin-specific ones.
            // The previous code fetched ALL. Let's keep that behavior for Admin for now, 
            // or maybe filtered by 'system' or specific admin ID if we had one.
            // Assuming 'All' for admin to monitor system health.
            query = {};
        } else {
            // Employee sees only theirs
            query = { employee: user.id };
        }

        const notifications = await Notification.find(query)
            .populate('organization', 'name')
            .populate('employee', 'personalDetails employeeId')
            .populate('employees', 'personalDetails employeeId')
            .populate('department', 'departmentName')
            .sort({ createdAt: -1 })
            .limit(50);

        const formattedNotifications = notifications.map(notification => ({
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            read: notification.readBy?.includes(user.id) || notification.read || false,
            createdAt: notification.createdAt,
            organization: notification.organization?.name || null,
            details: notification.details,
            audienceType: notification.audienceType || 'individual',
            department: notification.department?.departmentName || null,
            employee: notification.employee ? `${notification.employee.personalDetails?.firstName} ${notification.employee.personalDetails?.lastName}` : null,
            employees: notification.employees?.map(emp => `${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}`) || null
        }));

        return NextResponse.json({
            success: true,
            notifications: formattedNotifications
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
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

        // Ensure user owns the notification or is admin
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }

        if (user.role !== 'admin' && notification.employee?.toString() !== user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        if (!notification.readBy) notification.readBy = [];
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

// POST - Create a new notification
export async function POST(req) {
    await dbConnect();
    const user = await getUserFromRequest(req);
    
    // Ensure user is admin or super_admin
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, message, priority, type, audienceType, targetId, employees } = body;

        if (!title || !message) {
            return NextResponse.json({ message: "Title and message are required" }, { status: 400 });
        }

        const newNotification = new Notification({
            type: type || "system",
            title,
            message,
            priority: priority || 'medium',
            audienceType: audienceType || 'individual',
            organization: user.organizationId || null,
        });

        if (audienceType === 'organization') {
            // No specific IDs needed if it applies to the whole org
        } else if (audienceType === 'team') {
            newNotification.department = targetId;
        } else if (audienceType === 'individual') {
            if (employees && Array.isArray(employees) && employees.length > 0) {
                newNotification.employees = employees;
            } else if (targetId) {
                newNotification.employee = targetId;
            }
        }

        await newNotification.save();

        try {
            let targetEmails = [];
            
            if (audienceType === 'individual' && employees && employees.length > 0) {
                const emps = await Employee.find({ _id: { $in: employees } }, 'contactDetails.workEmail');
                targetEmails = emps.map(e => e.contactDetails?.workEmail).filter(Boolean);
            } else if (audienceType === 'team' && targetId) {
                const emps = await Employee.find({ department: targetId, status: 'Active' }, 'contactDetails.workEmail');
                targetEmails = emps.map(e => e.contactDetails?.workEmail).filter(Boolean);
            } else if (audienceType === 'organization') {
                const emps = await Employee.find({ organizationId: user.organizationId, status: 'Active' }, 'contactDetails.workEmail');
                targetEmails = emps.map(e => e.contactDetails?.workEmail).filter(Boolean);
            }
            
            if (targetEmails.length > 0) {
                const origin = req.headers.get("origin") || "http://localhost:3000";
                const { subject, html } = getSystemNotificationTemplate({
                    title: newNotification.title,
                    message: newNotification.message,
                    priority: newNotification.priority,
                    dashboardUrl: origin
                });
                
                targetEmails.forEach(email => {
                    sendEmail({
                        to: email,
                        subject,
                        html
                    }).catch(err => console.error("Failed to send notification email to", email, err));
                });
            }
        } catch (emailError) {
            console.error("Error sending notification emails:", emailError);
        }

        return NextResponse.json({
            success: true,
            message: "Notification sent successfully",
            notification: newNotification
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
