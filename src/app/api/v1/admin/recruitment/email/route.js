import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/service';
import { getManualCommunicationTemplate } from '@/lib/email/templates/recruitment';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);

        await dbConnect();
        const { candidateId, subject, message } = await request.json();

        if (!candidateId || !subject || !message) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const candidate = await Candidate.findById(candidateId).lean();
        if (!candidate) {
            return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
        }

        // Send formal manual email
        const result = await sendEmail({
            to: candidate.email,
            subject: subject,
            html: getManualCommunicationTemplate(candidate.name, subject, message)
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Email successfully sent to ${candidate.name}` 
        }, { status: 200 });

    } catch (error) {
        console.error("MANUAL EMAIL API ERROR:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Failed to send email" 
        }, { status: 500 });
    }
}
