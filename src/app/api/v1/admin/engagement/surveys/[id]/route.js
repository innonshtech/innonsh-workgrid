import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PulseSurvey from '@/lib/db/models/engagement/PulseSurvey';
import PulseResponse from '@/lib/db/models/engagement/PulseResponse';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function DELETE(req, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "company_admin", "super_admin", "hr"]);

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, message: 'Survey ID is required' }, { status: 400 });
        }

        await dbConnect();

        // Delete the survey
        const deletedSurvey = await PulseSurvey.findByIdAndDelete(id);

        if (!deletedSurvey) {
            return NextResponse.json({ success: false, message: 'Survey not found' }, { status: 404 });
        }

        // Also delete any responses associated with this survey to avoid orphaned records
        await PulseResponse.deleteMany({ surveyId: id });

        return NextResponse.json({ success: true, message: 'Survey deleted successfully' });
    } catch (error) {
        console.error('Delete survey error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}
