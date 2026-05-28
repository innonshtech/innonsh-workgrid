import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Bonus from "@/lib/db/models/payroll/Bonus";
import Department from "@/lib/db/models/crm/Department/department";
import Employee from "@/lib/db/models/payroll/Employee";
import Notification from "@/lib/db/models/notifications/NotificationConfig";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(req) {
    try {
        const user = await getAuthUser();
        await dbConnect();

        let query = {};

        if (user.role === 'employee') {
            const employee = await Employee.findById(user.id);
            const deptId = employee?.jobDetails?.departmentId;

            query = {
                $or: [
                    { targetAudience: 'All' },
                    { targetAudience: 'Individual', employees: user.id },
                    { targetAudience: 'Department', department: deptId }
                ],
                status: { $ne: 'Cancelled' }
            };

            // SaaS PROTECTION: Restrict to own org, but allow old null orgs
            if (employee?.jobDetails?.organizationId) {
                query.$and = [
                    { 
                        $or: [
                            { organizationId: employee.jobDetails.organizationId },
                            { organizationId: null },
                            { organizationId: { $exists: false } }
                        ] 
                    }
                ];
            }
        } else if (user.role === 'admin' || user.role === 'supervisor') {
            // SaaS PROTECTION: Admin restricted to their org, but allow old null orgs
            if (user.organizationId) {
                query.$or = [
                    { organizationId: user.organizationId },
                    { organizationId: null },
                    { organizationId: { $exists: false } }
                ];
            }

            const { searchParams } = new URL(req.url);
            const status = searchParams.get("status");
            if (status) query.status = status;
        } else {
            // super_admin - no org restriction
            const { searchParams } = new URL(req.url);
            const status = searchParams.get("status");
            if (status) query.status = status;
        }

        const bonuses = await Bonus.find(query)
            .populate('employees', 'personalDetails.firstName personalDetails.lastName')
            .populate('department', 'departmentName')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ bonuses });

    } catch (error) {
        console.error("Error fetching bonuses:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const user = await getAuthUser();
        authorize(user, ["admin", "super_admin"]);

        await dbConnect();
        const body = await req.json();
        const {
            title,
            description,
            type,
            amount,
            issuanceType,
            percentageBasis,
            targetAudience,
            employees,
            department,
            paymentDate
        } = body;

        // Validation
        if (!title || !amount || !paymentDate) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (targetAudience === 'Individual' && (!employees || employees.length === 0)) {
            return NextResponse.json({ message: "Please select employees for Individual bonus" }, { status: 400 });
        }

        if (targetAudience === 'Department' && !department) {
            return NextResponse.json({ message: "Please select a department" }, { status: 400 });
        }

        // SaaS PROTECTION: Admin must use their org
        const orgId = user.role === 'admin' ? user.organizationId : body.organizationId;

        const newBonus = await Bonus.create({
            title,
            description,
            type,
            amount,
            issuanceType,
            percentageBasis,
            targetAudience,
            employees: targetAudience === 'Individual' ? employees : [],
            department: targetAudience === 'Department' ? department : null,
            paymentDate,
            status: "Pending",
            createdBy: user.id,
            organizationId: orgId
        });

        // --- Notification Logic ---
        let targetEmployeeIds = [];
        let empFilter = {};

        // SaaS PROTECTION: Notifications only for org employees
        if (user.role === 'admin' && user.organizationId) {
            empFilter['jobDetails.organizationId'] = user.organizationId;
        }

        if (targetAudience === 'Individual') {
            targetEmployeeIds = employees;
        } else if (targetAudience === 'Department') {
            const departmentEmployees = await Employee.find({ 'jobDetails.departmentId': department, ...empFilter }).select('_id');
            targetEmployeeIds = departmentEmployees.map(e => e._id);
        } else if (targetAudience === 'All') {
            const allEmployees = await Employee.find(empFilter).select('_id');
            targetEmployeeIds = allEmployees.map(e => e._id);
        }

        if (targetEmployeeIds.length > 0) {
            const notifications = targetEmployeeIds.map(empId => ({
                type: 'bonus',
                title: `New Bonus: ${title}`,
                message: `A new ${type} bonus has been initiated. Status: Pending.`,
                priority: 'medium',
                employee: empId,
                details: {
                    bonusId: newBonus._id,
                    amount: issuanceType === 'Fixed' ? amount : `${amount}% of ${percentageBasis}`,
                    paymentDate
                }
            }));

            try {
                await Notification.insertMany(notifications);
            } catch (notifError) {
                console.error("Error inserting notifications:", notifError);
            }
        }

        return NextResponse.json({ message: "Bonus created successfully", bonus: newBonus });

    } catch (error) {
        console.error("Error creating bonus:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
