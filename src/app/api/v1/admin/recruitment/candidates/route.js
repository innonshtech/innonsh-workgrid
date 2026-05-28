import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import Employee from '@/lib/db/models/payroll/Employee';
import OnboardingChecklist from '@/lib/db/models/recruitment/OnboardingChecklist';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/service';
import {
    getApplicationReceivedTemplate,
    getRejectionEmailTemplate,
    getOnboardingWelcomeTemplate
} from '@/lib/email/templates/recruitment';
import { getCandidateStatusChangeTemplate } from '@/lib/email/templates';
import { generateOnboardingTasks } from '@/lib/ai/gemini';

const candidateSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    resumeUrl: z.string().url().optional(),
    jobRequisition: z.string().optional(),
    appliedRole: z.string().optional(),
    source: z.enum(['LinkedIn', 'Indeed', 'Referral', 'Website', 'Careers Portal', 'Other']).default('Website'),
    notes: z.string().optional(),
    parsedResume: z.any().optional()
});

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const status = searchParams.get('status');

        let query = {};
        
        // SaaS PROTECTION: Scope to org
        if (authUser.role === 'admin') {
            query.organizationId = authUser.organizationId;
        } else if (authUser.role === 'super_admin') {
            const orgId = searchParams.get('organizationId');
            if (orgId) query.organizationId = orgId;
        }

        if (jobId) query.jobRequisition = jobId;
        if (status) query.status = status;

        const candidates = await Candidate.find(query)
            .populate('jobRequisition', 'title department')
            .sort({ fitScore: -1, createdAt: -1 }); // Sort by fit score first

        return NextResponse.json({ success: true, candidates });
    } catch (error) {
        console.error("GET CANDIDATES ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        const validatedData = candidateSchema.parse(body);

        // SaaS PROTECTION: Attach org to candidate record
        const orgId = authUser.role === 'admin' ? authUser.organizationId : body.organizationId;

        // Gap Fix #9: Duplicate detection
        const existingCandidate = await Candidate.findOne({ 
            email: validatedData.email.toLowerCase(), 
            organizationId: orgId 
        });
        if (existingCandidate) {
            return NextResponse.json({ 
                success: false, 
                error: `Candidate with email ${validatedData.email} already exists in the pipeline (Status: ${existingCandidate.status})`,
                existingCandidate: { id: existingCandidate._id, status: existingCandidate.status, name: existingCandidate.name }
            }, { status: 409 });
        }

        const candidate = await Candidate.create({ ...validatedData, organizationId: orgId });

        // Gap Fix #7: Send application received email (non-blocking)
        try {
            const jobTitle = validatedData.appliedRole || 'the open position';
            await sendEmail({
                to: candidate.email,
                subject: `Application Received — ${jobTitle}`,
                html: getApplicationReceivedTemplate(candidate.name, jobTitle)
            });
        } catch (emailErr) {
            console.log("Email send skipped (no SMTP configured):", emailErr.message);
        }

        return NextResponse.json({ success: true, candidate, message: "Candidate application received" }, { status: 201 });
    } catch (error) {
        console.error("POST CANDIDATE ERROR:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return NextResponse.json({ 
                success: false, 
                error: 'A candidate with this email already exists in your organization' 
            }, { status: 409 });
        }
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

        if (!id) return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });

        const candidate = await Candidate.findById(id).populate('jobRequisition');
        if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

        const prevStatus = candidate.status;
        const newStatus = updateData.status;

        // Perform the update
        Object.assign(candidate, updateData);
        await candidate.save();

        // Send status-change email notification for ALL pipeline transitions
        if (newStatus && newStatus !== prevStatus) {
            try {
                const jobTitle = candidate.appliedRole || candidate.jobRequisition?.title || 'the position';
                const template = getCandidateStatusChangeTemplate({
                    candidateName: candidate.name,
                    jobTitle,
                    newStatus
                });
                if (template) {
                    await sendEmail({ to: candidate.email, subject: template.subject, html: template.html });
                }
            } catch (emailErr) {
                console.log(`Status email (${newStatus}) skipped:`, emailErr.message);
            }
        }

        // 🚀 AUTO-ONBOARDING TRIGGER with AI-powered smart tasks (Gap #12)
        if (newStatus === 'Hired' && prevStatus !== 'Hired') {
            try {
                // 1. Check if employee already exists by email
                let employee = await Employee.findOne({ 'personalDetails.email': candidate.email });

                if (!employee) {
                    const nameParts = candidate.name.split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Hired';

                    const department = candidate.jobRequisition?.department || "General";
                    const designation = candidate.appliedRole || candidate.jobRequisition?.title || "New Joiner";

                    // 2. Create basic Employee record
                    employee = await Employee.create({
                        employeeId: `EMP-${Date.now().toString().slice(-6)}`,
                        password: 'welcome_to_team',
                        personalDetails: {
                            firstName,
                            lastName,
                            email: candidate.email,
                            phone: candidate.phone || 'N/A',
                            dateOfJoining: new Date(),
                        },
                        jobDetails: {
                            department,
                            designation,
                            workLocation: "Remote / Office"
                        },
                        payslipStructure: {
                            salaryType: 'monthly',
                            basicSalary: 30000,
                            earnings: [],
                            deductions: []
                        },
                        workingHr: 9,
                        status: 'Active'
                    });
                }

                // 3. Check if Checklist already exists
                const existingChecklist = await OnboardingChecklist.findOne({ employee: employee._id });

                if (!existingChecklist) {
                    // Gap Fix #12: AI-generated smart onboarding tasks
                    let onboardingTasks;
                    try {
                        const aiResult = await generateOnboardingTasks({
                            department: candidate.jobRequisition?.department || 'General',
                            role: candidate.appliedRole || candidate.jobRequisition?.title || 'New Joiner',
                            location: candidate.jobRequisition?.location || 'Office'
                        });
                        onboardingTasks = (aiResult.tasks || []).map(t => ({
                            category: t.category || 'Documentation',
                            task: t.task,
                            status: 'Pending'
                        }));
                    } catch (aiErr) {
                        console.log("AI onboarding failed, using defaults:", aiErr.message);
                        onboardingTasks = [
                            { category: 'Documentation', task: 'Submit Personal Documents (ID/Address Proof)', status: 'Pending' },
                            { category: 'Documentation', task: 'Sign Employment Agreement & Policies', status: 'Pending' },
                            { category: 'IT Setup', task: 'Set up System & Corporate Email', status: 'Pending' },
                            { category: 'IT Setup', task: 'Configure Access to Project Tools (GitHub/Jira)', status: 'Pending' },
                            { category: 'Orientation', task: 'Company Culture & Values Introduction', status: 'Pending' },
                            { category: 'Orientation', task: 'Team Introduction & Department Briefing', status: 'Pending' },
                            { category: 'Finance', task: 'Submit Bank Details & Tax Declaration', status: 'Pending' }
                        ];
                    }

                    await OnboardingChecklist.create({
                        employee: employee._id,
                        tasks: onboardingTasks,
                        status: 'Not Started'
                    });
                }

                // Gap Fix #7: Send welcome email
                try {
                    const joiningDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
                    await sendEmail({
                        to: candidate.email,
                        subject: `🚀 Welcome Aboard — ${candidate.appliedRole || 'New Role'}`,
                        html: getOnboardingWelcomeTemplate(candidate.name, joiningDate, candidate.appliedRole)
                    });
                } catch (emailErr) {
                    console.log("Welcome email skipped:", emailErr.message);
                }
            } catch (triggerError) {
                console.error("Auto-onboarding trigger failed:", triggerError);
            }
        }

        return NextResponse.json({
            success: true,
            candidate,
            message: newStatus === 'Hired' ? "Candidate Hired & AI Onboarding Initiated!" : "Candidate updated successfully"
        });
    } catch (error) {
        console.error("PUT CANDIDATE ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
