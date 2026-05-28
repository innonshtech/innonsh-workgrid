import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import EmploymentHistory from "@/lib/db/models/payroll/EmploymentHistory";
import BusinessUnit from "@/lib/db/models/crm/organization/BusinessUnit";
import Department from "@/lib/db/models/crm/Department/department";
import Team from "@/lib/db/models/crm/organization/Team";
import { logActivity } from "@/lib/logger";

export async function POST(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { action, effectiveDate, reason, comments, updatedBy, ...details } = body;

        if (!action || !effectiveDate) {
            return NextResponse.json(
                { error: "Action and Effective Date are required" },
                { status: 400 }
            );
        }

        const employee = await Employee.findById(id);
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const previousDetails = {
            designation: employee.jobDetails.designation,
            departmentId: employee.jobDetails.departmentId,
            businessUnitId: employee.jobDetails.businessUnitId,
            reportingManager: employee.jobDetails.reportingManager,
            salary: employee.payslipStructure.grossSalary,
        };

        let updateData = { "jobDetails": { ...employee.jobDetails.toObject() } };
        let statusUpdate = employee.status;

        switch (action) {
            case "Promotion":
                if (details.designation) updateData.jobDetails.designation = details.designation;
                if (details.grossSalary) {
                    // We need to handle salary structure update if we want to be thorough
                    // But for now let's just update the main gross salary field
                    updateData.payslipStructure = {
                        ...employee.payslipStructure.toObject(),
                        grossSalary: details.grossSalary
                    };
                }
                break;

            case "Transfer":
                if (details.departmentId) updateData.jobDetails.departmentId = details.departmentId;
                if (details.businessUnitId) updateData.jobDetails.businessUnitId = details.businessUnitId;
                if (details.teamId) updateData.jobDetails.teamId = details.teamId;
                if (details.workLocation) updateData.jobDetails.workLocation = details.workLocation;
                if (details.reportingManager) updateData.jobDetails.reportingManager = details.reportingManager;
                break;

            case "Exit":
                statusUpdate = "Terminated"; // or Inactive
                break;

            default:
                return NextResponse.json({ error: "Invalid lifecycle action" }, { status: 400 });
        }

        // Update Employee
        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            {
                ...updateData,
                status: statusUpdate,
                updatedBy: updatedBy || null,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        const newDetails = {
            designation: updatedEmployee.jobDetails.designation,
            departmentId: updatedEmployee.jobDetails.departmentId,
            businessUnitId: updatedEmployee.jobDetails.businessUnitId,
            reportingManager: updatedEmployee.jobDetails.reportingManager,
            salary: updatedEmployee.payslipStructure.grossSalary,
        };

        // Create History Record
        const history = await EmploymentHistory.create({
            employeeId: id,
            action,
            effectiveDate: new Date(effectiveDate),
            previousDetails,
            newDetails,
            reason,
            comments,
            updatedBy: updatedBy || null
        });

        await logActivity({
            action: "lifecycle_event",
            entity: "Employee",
            entityId: employee.employeeId,
            description: `${action} processed for employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName} (${employee.employeeId})`,
            performedBy: { userId: updatedBy },
            details: { action, historyId: history._id },
            req: request
        });

        return NextResponse.json({
            message: `${action} processed successfully`,
            employee: updatedEmployee,
            history
        });

    } catch (error) {
        console.error("Lifecycle POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET history for an employee
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const history = await EmploymentHistory.find({ employeeId: id })
            .populate('previousDetails.departmentId', 'departmentName')
            .populate('newDetails.departmentId', 'departmentName')
            .populate('updatedBy', 'name')
            .sort({ effectiveDate: -1, createdAt: -1 });

        return NextResponse.json(history);
    } catch (error) {
        console.error("Lifecycle GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
