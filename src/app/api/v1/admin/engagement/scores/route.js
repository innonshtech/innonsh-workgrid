import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PulseResponse from '@/lib/db/models/engagement/PulseResponse';
import PulseSurvey from '@/lib/db/models/engagement/PulseSurvey';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();

        // Aggregate engagement scores
        const stats = await PulseResponse.aggregate([
            {
                $group: {
                    _id: "$surveyId",
                    averageScore: { $avg: "$engagementScore" },
                    totalResponses: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "pulsesurveys",
                    localField: "_id",
                    foreignField: "_id",
                    as: "survey"
                }
            },
            { $unwind: "$survey" }
        ]);

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('Engagement stats error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}
