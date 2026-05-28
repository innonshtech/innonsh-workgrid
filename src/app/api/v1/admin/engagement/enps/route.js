import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PulseSurvey from '@/lib/db/models/engagement/PulseSurvey';
import PulseResponse from '@/lib/db/models/engagement/PulseResponse';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();

        // 1. Find all eNPS enabled surveys
        const enpsSurveys = await PulseSurvey.find({ isEnps: true });
        const surveyIds = enpsSurveys.map(s => s._id);

        if (surveyIds.length === 0) {
            return NextResponse.json({ 
                success: true, 
                enps: 0, 
                totalResponses: 0, 
                breakdown: { promoters: 0, detractors: 0, passives: 0, promoterPct: 0, detractorPct: 0, passivePct: 0 } 
            });
        }

        // 2. Fetch all responses for these surveys
        const responses = await PulseResponse.find({ surveyId: { $in: surveyIds } });

        if (responses.length === 0) {
            return NextResponse.json({ 
                success: true, 
                enps: 0, 
                totalResponses: 0, 
                breakdown: { promoters: 0, detractors: 0, passives: 0, promoterPct: 0, detractorPct: 0, passivePct: 0 } 
            });
        }

        // 3. Calculate eNPS
        let promoters = 0; // 9-10
        let detractors = 0; // 0-6
        let passives = 0; // 7-8

        responses.forEach(resp => {
            const score = resp.engagementScore;
            if (score >= 9) promoters++;
            else if (score <= 6) detractors++;
            else passives++;
        });

        const total = responses.length;
        const promoterPct = (promoters / total) * 100;
        const detractorPct = (detractors / total) * 100;
        const passivePct = (passives / total) * 100;
        const enps = Math.round(promoterPct - detractorPct);

        return NextResponse.json({
            success: true,
            enps,
            totalResponses: total,
            breakdown: {
                promoters,
                detractors,
                passives,
                promoterPct: Math.round(promoterPct),
                detractorPct: Math.round(detractorPct),
                passivePct: Math.round(passivePct)
            }
        });
    } catch (error) {
        console.error('eNPS calculation error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}
