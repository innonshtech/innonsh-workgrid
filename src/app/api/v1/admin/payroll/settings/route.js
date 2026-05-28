import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollConfig from '@/lib/db/models/payroll/PayrollConfig';
import Organization from '@/lib/db/models/crm/organization/Organization';
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        const { searchParams } = new URL(request.url);
        let orgId = searchParams.get('orgId');

        // SaaS PROTECTION: Admin restricted to their org
        if (authUser.role === "admin" || authUser.role === "supervisor") {
            orgId = authUser.organizationId;
        }

        if (!orgId) {
            // If super_admin and no orgId, default to first org or return error
            if (authUser.role === "super_admin") {
                const firstOrg = await Organization.findOne();
                if (!firstOrg) return NextResponse.json({ error: "No organizations found" }, { status: 404 });
                orgId = firstOrg._id;
            } else {
                return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
            }
        }

        let config = await PayrollConfig.findOne({ company: orgId });
        if (!config) {
            config = await PayrollConfig.create({ company: orgId });
        }
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        await dbConnect();
        const body = await request.json();
        let { company } = body;

        console.log("💾 [PayrollConfig] Received Save Request:", { 
            company,
            receivedFields: Object.keys(body),
            quota: body.annualPaidLeaveQuota 
        });

        // SaaS PROTECTION: Admin must use their assigned organizationId
        if (authUser.role === "admin") {
            company = authUser.organizationId;
            body.company = company;
        }

        if (!company) {
             console.error("❌ [PayrollConfig] Missing Company ID");
             return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
        }

        try {
            let config = await PayrollConfig.findOneAndUpdate(
                { company },
                body,
                { new: true, upsert: true, runValidators: true }
            );
            console.log("✅ [PayrollConfig] Saved Successfully:", config._id);
            return NextResponse.json(config);
        } catch (dbError) {
            console.error("❌ [PayrollConfig] DB Sync Error:", dbError.message);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
    } catch (error) {
        console.error("❌ [PayrollConfig] API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
