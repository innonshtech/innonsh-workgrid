import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        let query = {};
        
        // SaaS PROTECTION: Scope to org
        if (authUser.role !== 'super_admin' && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        if (jobId) query.jobRequisition = jobId;

        const candidates = await Candidate.find(query)
            .populate('jobRequisition', 'title department')
            .sort({ createdAt: -1 });

        // Group candidates by status (stages)
        const pipeline = candidates.reduce((acc, candidate) => {
            const status = candidate.status || 'Applied';
            if (!acc[status]) acc[status] = [];
            acc[status].push(candidate);
            return acc;
        }, {});

        return NextResponse.json({ 
            success: true,
            pipeline,
            candidates,
            totalCandidates: candidates.length
        });
    } catch (error) {
        console.error("PIPELINE API ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
