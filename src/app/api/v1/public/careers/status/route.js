import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const id = searchParams.get('id');
        
        if (!email || !id) return NextResponse.json({ success: false, error: 'Email and Application ID required' }, { status: 400 });
        
        const candidate = await Candidate.findOne({ email, _id: id })
            .populate('jobRequisition', 'title department name')
            .select('status name email jobRequisition createdAt interviews fitScore parsedResume');
            
        if (!candidate) return NextResponse.json({ success: false, error: 'Application not found with provided credentials' }, { status: 404 });
        
        return NextResponse.json({ success: true, application: candidate });
    } catch (error) {
        console.error("STATUS CHECK ERROR:", error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
