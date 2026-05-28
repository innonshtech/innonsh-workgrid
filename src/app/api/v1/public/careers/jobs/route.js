import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        
        const query = { status: 'Open' };
        if (orgId) query.organizationId = orgId;
        
        const jobs = await JobRequisition.find(query)
            .select('title department location type description requirements skillsRequired salaryRange createdAt')
            .sort({ createdAt: -1 });
            
        return NextResponse.json({ success: true, jobs });
    } catch (error) {
        console.error("PUBLIC GET JOBS ERROR:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
