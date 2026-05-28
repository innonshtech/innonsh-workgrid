import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import OnboardingChecklist from '@/lib/db/models/recruitment/OnboardingChecklist';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        let query = {};
        
        // SaaS PROTECTION
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        if (employeeId) query.employee = employeeId;

        const checklists = await OnboardingChecklist.find(query).populate('employee', 'personalDetails employmentDetails');
        return NextResponse.json({ success: true, checklists });
    } catch (error) {
        console.error("GET ONBOARDING ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        
        // SaaS PROTECTION
        const orgId = authUser.role !== 'super_admin' ? authUser.organizationId : body.organizationId;

        const checklist = await OnboardingChecklist.create({ ...body, organizationId: orgId });
        return NextResponse.json({ success: true, checklist, message: "Onboarding checklist created" }, { status: 201 });
    } catch (error) {
        console.error("POST ONBOARDING ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        const { id, ...updateData } = body;

        const checklist = await OnboardingChecklist.findByIdAndUpdate(id, updateData, { new: true });
        return NextResponse.json({ success: true, checklist, message: "Checklist updated" });
    } catch (error) {
        console.error("PUT ONBOARDING ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
