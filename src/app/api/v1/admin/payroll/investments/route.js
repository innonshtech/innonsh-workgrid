import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import InvestmentDeclaration from '@/lib/db/models/payroll/InvestmentDeclaration';
import Employee from '@/lib/db/models/payroll/Employee';
import { logActivity } from '@/lib/logger';
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const financialYear = searchParams.get('financialYear') || "2025-26";
        const organizationId = searchParams.get('organizationId');

        // SaaS PROTECTION: Restrict by organization
        let filter = { financialYear };

        if (authUser.role === "admin" || authUser.role === "supervisor") {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": authUser.organizationId 
            }).distinct("_id");
            filter.employeeId = { $in: orgEmployees };
        } else if (authUser.role === "employee") {
            filter.employeeId = authUser.id;
        } else if (authUser.role === "super_admin" && organizationId) {
            const orgEmployees = await Employee.find({ 
                "jobDetails.organizationId": organizationId 
            }).distinct("_id");
            filter.employeeId = { $in: orgEmployees };
        }

        if (employeeId) {
             // Validate if employee belongs to authUser's org
             if (filter.employeeId && filter.employeeId.$in) {
                 const isAllowed = filter.employeeId.$in.some(id => id.toString() === employeeId);
                 if (!isAllowed) filter.employeeId = { $in: [] };
                 else filter.employeeId = employeeId;
             } else if (filter.employeeId && filter.employeeId.toString() !== employeeId) {
                 filter.employeeId = { $in: [] };
             } else {
                 filter.employeeId = employeeId;
             }
        }

        if (!employeeId && authUser.role !== "super_admin" && !authUser.organizationId) {
             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!employeeId && (authUser.role === "admin" || authUser.role === "super_admin")) {
            // Admin view: Fetch all declarations for the FY (within filtered org)
            const declarations = await InvestmentDeclaration.find(filter)
                .populate('employeeId', 'personalDetails.firstName personalDetails.lastName employeeId');
            return NextResponse.json(declarations);
        }

        let declaration = await InvestmentDeclaration.findOne(filter);

        if (!declaration && employeeId) {
            // Create a default empty declaration if not found (Only if specific employee is requested)
            declaration = {
                employeeId,
                financialYear,
                status: 'Draft',
                sections: {
                    section80C: { ppf: 0, elss: 0, lic: 0, nsc: 0, others: 0, total: 0 },
                    section80D: { mediclaimSelf: 0, mediclaimParents: 0, total: 0 },
                    hra: { annualRent: 0, landlordPan: '', city: 'Non-Metro' },
                    otherDeductions: { standardDeduction: 50000, professionalTax: 0, others: 0 }
                }
            };
        }

        return NextResponse.json(declaration || null);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const body = await request.json();
        const { employeeId, financialYear, sections, actualSubmissions, status, remark } = body;

        if (!employeeId || !financialYear) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // SaaS PROTECTION: Validate employee ownership
        const employee = await Employee.findById(employeeId);
        if (!employee) {
             return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        if (authUser.role === "admin" && employee.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        } else if (authUser.role === "employee" && authUser.id !== employeeId.toString()) {
            return NextResponse.json({ error: "Forbidden: You can only submit your own declaration" }, { status: 403 });
        }

        // Calculate totals for 80C and 80D
        if (sections) {
            if (sections.section80C) {
                const s = sections.section80C;
                sections.section80C.total = (s.ppf || 0) + (s.elss || 0) + (s.lic || 0) + (s.nsc || 0) + (s.others || 0);
            }
            if (sections.section80D) {
                const s = sections.section80D;
                sections.section80D.total = (s.mediclaimSelf || 0) + (s.mediclaimParents || 0);
            }
        }

        const updateData = {
            employeeId,
            financialYear,
            status: body.submit ? 'Pending' : (status || 'Draft')
        };

        if (sections) updateData.sections = sections;
        if (actualSubmissions) updateData.actualSubmissions = actualSubmissions;
        if (remark) updateData.remark = remark;

        const declaration = await InvestmentDeclaration.findOneAndUpdate(
            { employeeId, financialYear },
            updateData,
            { upsert: true, new: true }
        );

        await logActivity({
            action: body.submit ? "submitted" : "saved_draft",
            entity: "InvestmentDeclaration",
            entityId: declaration._id,
            description: `${body.submit ? 'Submitted' : 'Saved draft'} investment declaration for FY ${financialYear}`,
            performedBy: { userId: authUser.id, name: authUser.name },
            req: request
        });

        return NextResponse.json(declaration, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
