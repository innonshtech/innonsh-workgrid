import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import LeaveApplication from "@/lib/db/models/payroll/LeaveApplication";
import Employee from "@/lib/db/models/payroll/Employee";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";
import { calculateEffectiveLeaveDays } from "@/lib/utils/leave-calculator";
import { sendEmail } from "@/lib/email/service";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

// GET leave applications
export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");
        const managerId = searchParams.get("managerId");

        let filter = {};
        
        // SaaS PROTECTION: Restrict by organization
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": authUser.organizationId 
            }).distinct("_id");
            filter.employee = { $in: orgEmployees };
        } else if (managerId) {
            // Mapping: The reportingManager in the DB is an Employee ID, while managerId from frontend is often a User ID.
            // We find the employee record belonging to the authUser/managerId first.
            let managerEmployee = null;
            if (mongoose.Types.ObjectId.isValid(managerId)) {
                managerEmployee = await Employee.findById(managerId);
                if (!managerEmployee) {
                    const userRecord = await User.findById(managerId);
                    if (userRecord && userRecord.employeeId) {
                        managerEmployee = await Employee.findOne({ employeeId: userRecord.employeeId });
                    }
                }
            }
            
            if (managerEmployee) {
                // Find IDs of employees who report directly to this manager
                const managedEmployees = await Employee.find({ 
                    "jobDetails.reportingManager": managerEmployee._id 
                }).distinct("_id");
                
                // Return applications where:
                // 1. The applicant is a direct report
                // 2. The manager is explicitly part of the approval chain
                // 3. The manager is the final designated authority
                filter.$and = [
                    {
                        $or: [
                            { employee: { $in: managedEmployees } },
                            { "approvalChain.approverId": managerEmployee._id },
                            { "finalApproverId": managerEmployee._id }
                        ]
                    }
                ];
            } else {
                // If we can't find an employee record for this manager ID, return empty list
                return NextResponse.json({ applications: [] });
            }
        } else if (authUser.role === "employee") {
            filter.employee = authUser.id;
        }

        if (employeeId && authUser.role !== "employee") filter.employee = employeeId;
        if (status) filter.status = status;

        const applications = await LeaveApplication.find(filter)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        return NextResponse.json({ applications });
    } catch (error) {
        console.error("Error in GET /api/payroll/leave-applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// SUBMIT a new leave application
export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const body = await request.json();
        const {
            employeeId,
            leaveType,
            leaveCategory,
            startDate,
            endDate,
            totalDays,
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments
        } = body;

        if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1. Force Recalculate Actual Deductible Days
        const calcResult = await calculateEffectiveLeaveDays(employeeId, startDate, endDate);
        let actualLeaveDays = calcResult.totalEffectiveDays;

        if (leaveType === 'WFH') {
            actualLeaveDays = 0;
        } else if (leaveType === 'Half Day') {
            actualLeaveDays = actualLeaveDays * 0.5;
        }

        const application = await LeaveApplication.create({
            employee: employeeId,
            leaveType,
            leaveCategory: leaveCategory || undefined,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalDays: actualLeaveDays, // Use the server-side validated calculation securely
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments: attachments || [],
            status: "Pending"
        });

        const employee = await Employee.findById(employeeId).populate('jobDetails.reportingManager');

        // Log activity
        await logActivity({
            action: "created",
            entity: "LeaveApplication",
            entityId: application._id,
            description: `New leave application from ${employee?.personalDetails?.firstName || 'Employee'} (${actualLeaveDays} days)`,
            performedBy: {
                userId: authUser.id,
                name: authUser.name
            },
            req: request
        });

        // 2. Dual Notification System (HR & Manager)
        const emailPromises = [];
        
        // Find HR/Admin emails
        const hrAdmins = await User.find({ role: 'admin', isActive: true });
        const hrEmails = hrAdmins.map(admin => admin.email).filter(Boolean);

        const emailContent = `
            <h2>New Leave Application Pending</h2>
            <p><strong>Employee:</strong> ${employee?.personalDetails?.firstName} ${employee?.personalDetails?.lastName}</p>
            <p><strong>Type:</strong> ${leaveCategory ? `${leaveCategory} (${leaveType})` : leaveType}</p>
            <p><strong>Dates:</strong> ${new Date(startDate).toDateString()} to ${new Date(endDate).toDateString()}</p>
            <p><strong>Deductible Days:</strong> ${actualLeaveDays}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <br/>
            <p>Please log in to the portal to review and approve.</p>
        `;

        // Email to Global HR
        if (hrEmails.length > 0) {
            emailPromises.push(sendEmail({
                to: hrEmails.join(','),
                subject: "Leave Application Pending Approval",
                html: emailContent
            }));
        }

        // Email to Reporting Manager (Dual Notification)
        const reportingManager = employee.jobDetails?.reportingManager;
        if (reportingManager) {
            const managerUser = await User.findOne({ employeeId: reportingManager._id });
            if (managerUser && managerUser.email) {
                emailPromises.push(sendEmail({
                    to: managerUser.email,
                    subject: "Action Required: Your Team Member's Leave Request",
                    html: emailContent
                }));
            }
        }

        // Fire emails without blocking response
        Promise.allSettled(emailPromises);

        return NextResponse.json({ success: true, application }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/payroll/leave-applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
