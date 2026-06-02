import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HelpdeskTicket from "@/lib/db/models/HelpdeskTicket";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import { getAuthUser } from "@/lib/auth-util";

export async function GET(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fetchUsers = searchParams.get("fetchUsers");
        if (fetchUsers) {
            let userQuery = { isActive: true, role: { $in: ["admin", "super_admin", "hr", "manager"] } };
            let empQuery = { status: "Active" };
            if (authUser.role !== "super_admin") {
                userQuery.organizationId = authUser.organizationId;
                empQuery['jobDetails.organizationId'] = authUser.organizationId;
            }
            const users = await User.find(userQuery).select('name email role');
            const employees = await Employee.find(empQuery).select('personalDetails.firstName personalDetails.lastName role');

            // Format employees to look like users
            const formattedEmployees = employees.map(emp => ({
                _id: emp._id.toString(),
                name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                role: emp.role || 'employee'
            }));

            const allAssignees = [
                ...users.map(u => ({ _id: u._id.toString(), name: u.name, role: u.role })),
                ...formattedEmployees
            ];

            return NextResponse.json(allAssignees);
        }

        const employeeId = searchParams.get("employeeId");
        const status = searchParams.get("status");
        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");

        let query = {};
        
        // Tenant and Role Isolation Scoping
        if (authUser.role === "employee" || authUser.role === "attendance_only") {
            const emp = await Employee.findById(authUser.id);
            if (!emp) {
                return NextResponse.json([], { status: 200 });
            }
            query.$or = [
                { employee: emp._id },
                { assignedTo: emp._id }
            ];
        } else if (authUser.role !== "super_admin") {
            const myOrgEmployees = await Employee.find({ 'jobDetails.organizationId': authUser.organizationId }).select('_id');
            const myOrgEmployeeIds = myOrgEmployees.map(e => e._id);
            query.employee = { $in: myOrgEmployeeIds };
        }

        // Apply employeeId filter if passed by admin
        if (employeeId) {
            let targetEmpId = employeeId;
            if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
                const emp = await Employee.findOne({ employeeId: employeeId });
                if (emp) targetEmpId = emp._id.toString();
            }

            if (query.employee) {
                if (query.employee.$in) {
                    const stringIds = query.employee.$in.map(id => id.toString());
                    if (stringIds.includes(targetEmpId)) {
                        query.employee = targetEmpId;
                    } else {
                        return NextResponse.json({ error: "Forbidden: Access is denied" }, { status: 403 });
                    }
                } else {
                    if (query.employee.toString() !== targetEmpId) {
                        return NextResponse.json({ error: "Forbidden: Access is denied" }, { status: 403 });
                    }
                }
            } else {
                query.employee = targetEmpId;
            }
        }

        if (status) query.status = status;

        // Pagination
        if (pageParam || limitParam) {
            const page = parseInt(pageParam) || 1;
            const limit = parseInt(limitParam) || 10;
            const skip = (page - 1) * limit;

            const total = await HelpdeskTicket.countDocuments(query);
            const tickets = await HelpdeskTicket.find(query)
                .populate("employee", "personalDetails.firstName personalDetails.lastName")
                .populate("assignedTo", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return NextResponse.json({
                tickets,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        }

        const tickets = await HelpdeskTicket.find(query)
            .populate("employee", "personalDetails.firstName personalDetails.lastName")
            .populate("assignedTo", "name")
            .sort({ createdAt: -1 });

        return NextResponse.json(tickets);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Simple validation
        if (!body.subject || !body.description || !body.employee) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let employeeObjectId = body.employee;

        let emp = null;
        if (employeeObjectId.match(/^[0-9a-fA-F]{24}$/)) {
            emp = await Employee.findById(employeeObjectId);
        }

        if (!emp) {
            emp = await Employee.findOne({ employeeId: employeeObjectId });
        }

        if (!emp) {
            return NextResponse.json({ error: "Employee record not found. Please ensure you have an active Employee profile." }, { status: 404 });
        }

        // Security Check: Standard employees can only create tickets for themselves
        if (authUser.role === "employee" || authUser.role === "attendance_only") {
            const userEmp = await Employee.findById(authUser.id);
            if (!userEmp || userEmp._id.toString() !== emp._id.toString()) {
                return NextResponse.json({ error: "Forbidden: You can only create tickets for yourself" }, { status: 403 });
            }
        } else if (authUser.role !== "super_admin") {
            if (emp.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
                return NextResponse.json({ error: "Forbidden: Employee belongs to another organization" }, { status: 403 });
            }
        }

        employeeObjectId = emp._id;

        const newTicket = await HelpdeskTicket.create({
            ...body,
            employee: employeeObjectId
        });

        return NextResponse.json(newTicket, { status: 201 });
    } catch (error) {
        console.error("Helpdesk Create Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
