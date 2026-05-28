import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Loan from "@/lib/db/models/payroll/Loan";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser } from "@/lib/auth-util";

export async function GET(req) {
    try {
        const user = await getAuthUser();
        await dbConnect();
        let query = {};
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const employeeId = searchParams.get("employeeId");

        // SaaS PROTECTION: Restrict by organization
        if (user.role === "admin" || user.role === "supervisor") {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": user.organizationId 
            }).distinct("_id");
            query.employee = { $in: orgEmployees };
        } else if (user.role === "employee") {
            query.employee = user.id;
        }

        if (status) query.status = status;
        if (employeeId && user.role !== "employee") query.employee = employeeId;

        const rawLoans = await Loan.find(query)
            .populate({
                path: "employee",
                select:
                    "name email personalDetails.firstName personalDetails.lastName personalDetails.email",
            })
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const formattedLoans = rawLoans.map((loan) => {
            const emp = loan.employee;

            if (!emp) {
                return {
                    ...loan,
                    employee: {
                        _id: null,
                        name: "Unknown",
                        email: "",
                    },
                };
            }

            // Detect model by available fields instead of relying on onModel
            const isEmployeeModel =
                emp.personalDetails &&
                (emp.personalDetails.firstName ||
                    emp.personalDetails.lastName);

            let name = "Unknown";
            let email = "";

            if (isEmployeeModel) {
                name =
                    `${emp.personalDetails?.firstName || ""} ${emp.personalDetails?.lastName || ""
                        }`.trim() || "Unknown";

                email = emp.personalDetails?.email || "";
            } else {
                name = emp.name || "Unknown";
                email = emp.email || "";
            }

            return {
                ...loan,
                employee: {
                    _id: emp._id,
                    name,
                    email,
                },
            };
        });

        return NextResponse.json({ loans: formattedLoans });
    } catch (error) {
        console.error("Error fetching loans:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const user = await getAuthUser();
        await dbConnect();
        const body = await req.json();
        const { amount, reason, type, installments, employeeId } = body;

        if (!amount || !reason || amount <= 0) {
            return NextResponse.json(
                { message: "Invalid input" },
                { status: 400 }
            );
        }

        // Determine target employee
        let targetEmployeeId = user.id;
        let onModel = user.role === "employee" ? "Employee" : "User";

        if ((user.role === "admin" || user.role === "super_admin") && employeeId) {
            // Admin is creating a loan for a specific employee
            const targetEmployee = await Employee.findById(employeeId);
            if (!targetEmployee) {
                return NextResponse.json({ message: "Employee not found" }, { status: 404 });
            }
            // SaaS PROTECTION: Admin can only create loans for employees in their org
            if (user.role === "admin" && targetEmployee.jobDetails?.organizationId?.toString() !== user.organizationId) {
                return NextResponse.json({ message: "Forbidden: Employee not in your organization" }, { status: 403 });
            }
            targetEmployeeId = employeeId;
            onModel = "Employee";
        }

        const newLoan = await Loan.create({
            employee: targetEmployeeId,
            onModel,
            amount,
            reason,
            type: type || "Advance",
            installments: installments || 1,
            status: "Pending",
        });

        return NextResponse.json({
            message: "Loan requested successfully",
            loan: newLoan,
        });
    } catch (error) {
        console.error("Error creating loan:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
