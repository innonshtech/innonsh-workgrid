import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PulseSurvey from '@/lib/db/models/engagement/PulseSurvey';
import Employee from '@/lib/db/models/payroll/Employee';
import { sendEmail } from '@/lib/email/service';
import { getSurveyTemplate } from '@/lib/email/templates/index';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
        
        await dbConnect();

        let query = {};
        if (authUser.role === 'employee') {
            // For employees, only show published surveys
            query.status = 'Published';
        }

        const surveys = await PulseSurvey.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, surveys });
    } catch (error) {
        console.error('Fetch surveys error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}

export async function POST(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();

        const body = await req.json();
        const survey = await PulseSurvey.create({
            ...body,
            createdBy: authUser.id
        });

        // Trigger email notification if survey is published
        if (survey.status === 'Published') {
            const dashboardUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
            // Fetch all employees with emails
            const employees = await Employee.find({ 'personalDetails.email': { $exists: true } }).select('personalDetails.email');
            const emails = employees.map(emp => emp.personalDetails?.email).filter(Boolean);

            if (emails.length > 0) {
                const emailHtml = getSurveyTemplate(survey.title, dashboardUrl);
                // In production, you might want to send this in batches or via a queue
                // For now, we'll send to all recipients in BCC to keep it simple and efficient
                await sendEmail({
                    to: emails, // sendEmail utility handles array
                    subject: `New Pulse Survey: ${survey.title}`,
                    html: emailHtml
                });
            }
        }

        return NextResponse.json({ success: true, survey }, { status: 201 });
    } catch (error) {
        console.error('Create survey error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}
