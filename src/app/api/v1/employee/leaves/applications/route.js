import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import LeaveApplication from "@/lib/db/models/payroll/LeaveApplication";
import Employee from "@/lib/db/models/payroll/Employee";
import { logActivity } from "@/lib/logger";
import { getAuthUser } from "@/lib/auth-util";
import { calculateEffectiveLeaveDays } from "@/lib/utils/leave-calculator";
import { sendEmail } from "@/lib/email/service";
import User from "@/lib/db/models/User";
console.log("🚀 Initializing Leave Applications API Route");

// GET leave applications for the logged-in employee
export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        // Find correct employee document
        let employeeDoc = null;
        if (mongoose.Types.ObjectId.isValid(authUser.id)) {
            // First check if authUser.id is directly the Employee _id
            employeeDoc = await Employee.findById(authUser.id);
            
            // Fallback: Check if it's a User _id
            if (!employeeDoc) {
                const userRecord = await User.findById(authUser.id);
                if (userRecord && userRecord.employeeId) {
                    employeeDoc = await Employee.findOne({ employeeId: userRecord.employeeId });
                }
            }
        }
        
        if (!employeeDoc) {
            return NextResponse.json({ applications: [], message: "No employee profile found" });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const filter = { employee: employeeDoc._id };
        if (status) filter.status = status;

        const applications = await LeaveApplication.find(filter)
            .populate("employee", "personalDetails employeeId")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        return NextResponse.json({ applications });
    } catch (error) {
        console.error("Error in GET /api/v1/employee/leaves/applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// SUBMIT a new leave application (Employee Self Service)
export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const body = await request.json();
        const {
            leaveType,
            startDate,
            endDate,
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments,
            selectedApproverIds = []
        } = body;

        // 1. Resolve Employee Profile (Robust match)
        let employee = null;
        if (mongoose.Types.ObjectId.isValid(authUser.id)) {
            employee = await Employee.findById(authUser.id);
            
            if (!employee) {
                const userRecord = await User.findById(authUser.id);
                if (userRecord && userRecord.employeeId) {
                    employee = await Employee.findOne({ employeeId: userRecord.employeeId });
                }
            }
        }

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found. Please contact HR." }, { status: 404 });
        }

        // 2. Fetch employee with full hierarchy (populate for chain building)
        await employee.populate('jobDetails.reportingManager jobDetails.teamLead');

        // 3. Force Recalculate Actual Deductible Days using correct Employee _id
        const calcResult = await calculateEffectiveLeaveDays(employee._id, startDate, endDate);
        const actualLeaveDays = calcResult.totalEffectiveDays;
        
        // 3. Build Approval Chain based on selection
        const approvalChain = [];
        let finalApproverId = null;

        const managerId = employee.jobDetails?.reportingManager?._id?.toString();
        const teamLeadId = employee.jobDetails?.teamLead?._id?.toString();

        // Add Team Lead if selected and assigned
        if (teamLeadId && selectedApproverIds.includes(teamLeadId)) {
            approvalChain.push({
                level: 'Team Lead',
                approverId: teamLeadId,
                status: 'Pending'
            });
            finalApproverId = teamLeadId;
        }

        // Add Manager if selected and assigned
        if (managerId && selectedApproverIds.includes(managerId)) {
            approvalChain.push({
                level: 'Manager',
                approverId: managerId,
                status: 'Pending'
            });
            finalApproverId = managerId;
        }

        // Add Custom Approvers from selection
        for (const id of selectedApproverIds) {
            // Already added as TL or Manager
            if (id === managerId || id === teamLeadId) continue;
            
            // Basic validation: ensure id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) continue;

            approvalChain.push({
                level: 'Selected Approver',
                approverId: id,
                status: 'Pending'
            });
            
            // If no final authority is set yet, this one becomes final
            // If TL was final, this takes over. If Manager was final, Manager STAYS final.
            if (!finalApproverId || finalApproverId === teamLeadId) {
                finalApproverId = id;
            }
        }

        // Final supremacy check: Manager ALWAYS takes final if present in chain
        if (managerId && selectedApproverIds.includes(managerId)) {
            finalApproverId = managerId;
        }

        const application = await LeaveApplication.create({
            employee: employee._id,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalDays: actualLeaveDays,
            reason,
            contactNumber,
            addressDuringLeave,
            isAdvanceLeave,
            attachments: attachments || [],
            status: "Pending",
            approvalChain,
            finalApproverId
        });

        // Log activity
        await logActivity({
            action: "created",
            entity: "LeaveApplication",
            entityId: application._id,
            description: `Employee ${employee?.personalDetails?.firstName} submitted a leave application (${actualLeaveDays} days)`,
            performedBy: {
                userId: authUser.id,
                name: authUser.name
            },
            req: request
        });

        // 2. Dual Notification System (HR & Manager)
        const emailPromises = [];
        
        // Find HR/Admins for this organization
        const hrAdmins = await User.find({ 
            organizationId: authUser.organizationId, 
            role: 'admin', 
            isActive: true 
        });
        const hrEmails = hrAdmins.map(admin => admin.email).filter(Boolean);

        const emailContent = `
            <h2>New Leave Application Pending</h2>
            <p><strong>Employee:</strong> ${employee?.personalDetails?.firstName} ${employee?.personalDetails?.lastName}</p>
            <p><strong>Type:</strong> ${leaveType}</p>
            <p><strong>Dates:</strong> ${new Date(startDate).toDateString()} to ${new Date(endDate).toDateString()}</p>
            <p><strong>Deductible Days:</strong> ${actualLeaveDays}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <br/>
            <p>Please log in to the portal to review and approve.</p>
        `;

        // Email to Global HR/Admins
        if (hrEmails.length > 0) {
            emailPromises.push(sendEmail({
                to: hrEmails.join(','),
                subject: "Leave Application Pending Approval",
                html: emailContent
            }));
        }

        // Email to Selected Approvers
        if (selectedApproverIds.length > 0) {
            const approvers = await Employee.find({ _id: { $in: selectedApproverIds } });
            for (const approver of approvers) {
                const approverUser = await User.findOne({ employeeId: approver._id });
                if (approverUser && approverUser.email) {
                    emailPromises.push(sendEmail({
                        to: approverUser.email,
                        subject: "Action Required: Your Team Member's Leave Request",
                        html: emailContent
                    }));
                }
            }
        }

        Promise.allSettled(emailPromises);

        return NextResponse.json({ success: true, application }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/v1/employee/leaves/applications:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
