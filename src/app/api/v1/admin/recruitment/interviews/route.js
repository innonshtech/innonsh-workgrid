import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import Employee from '@/lib/db/models/payroll/Employee';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();

        // SaaS PROTECTION: Scope to org
        let query = {};
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        // Fetch candidates with interviews
        const candidates = await Candidate.find(query)
            .populate('jobRequisition', 'title department')
            .populate('interviews.interviewer', 'personalDetails jobDetails')
            .lean();

        // Also fetch active employees to be used as interviewers
        const interviewerQuery = { status: 'Active' };
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            interviewerQuery['jobDetails.organizationId'] = authUser.organizationId;
        }

        const interviewers = await Employee.find(interviewerQuery)
            .select('personalDetails jobDetails')
            .lean();

        // Flatten interviews for easy consumption by the UI
        const allInterviews = candidates.flatMap(candidate =>
            (candidate.interviews || []).map(interview => {
                // Format interviewer name if populated
                let interviewerData = interview.interviewer;
                if (interviewerData && interviewerData.personalDetails) {
                    interviewerData = {
                        ...interviewerData,
                        name: `${interviewerData.personalDetails.firstName} ${interviewerData.personalDetails.lastName}`
                    };
                }

                return {
                    ...interview,
                    interviewer: interviewerData, // Replace with object containing the name
                    candidateId: candidate._id,
                    candidateName: candidate.name,
                    candidateEmail: candidate.email,
                    role: candidate.appliedRole || candidate.jobRequisition?.title || "N/A",
                    interviewId: interview._id
                };
            })
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        return NextResponse.json({
            success: true,
            interviews: allInterviews,
            interviewers: interviewers.map(emp => ({
                _id: emp._id,
                name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                designation: emp.jobDetails?.designation,
                department: emp.jobDetails?.department
            }))
        });
    } catch (error) {
        console.error("GET INTERVIEWS ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        const { candidateId, interview } = body;

        if (!candidateId || !interview) {
            return NextResponse.json({ error: "Candidate ID and interview details are required" }, { status: 400 });
        }
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            console.error("CANDIDATE NOT FOUND:", candidateId);
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Logic to sync status with the round type
        const roundToStageMap = {
            'Screening': 'Screening',
            'Technical Interview': 'Technical Interview',
            'Managerial Interview': 'Managerial Interview',
            'HR Interview': 'HR Interview'
        };

        if (roundToStageMap[interview.round]) {
            candidate.status = roundToStageMap[interview.round];
        }

        // Add to interviews array
        candidate.interviews.push(interview);
        await candidate.save();

        // 🚀 Gap Fix #10: Send Interview Invitation Email
        try {
            const { sendEmail } = await import('@/lib/email/service');
            const { getInterviewInviteTemplate } = await import('@/lib/email/templates/recruitment');
            
            // Resolve interviewer name
            const interviewer = await Employee.findById(interview.interviewer).lean();
            const interviewerName = interviewer ? `${interviewer.personalDetails.firstName} ${interviewer.personalDetails.lastName}` : 'an HR Representative';
            
            // Format date for email
            const formattedDate = new Date(interview.date).toLocaleString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            await sendEmail({
                to: candidate.email,
                subject: `Interview Invitation: ${interview.round} — ${candidate.appliedRole || 'the position'}`,
                html: getInterviewInviteTemplate(
                    candidate.name, 
                    interview.round, 
                    formattedDate, 
                    interview.meetingLink, 
                    interviewerName,
                    interview.mode,
                    interview.location
                )
            });
        } catch (emailErr) {
            console.warn("📧 Interview email skipped:", emailErr.message);
        }

        return NextResponse.json({ success: true, message: "Interview scheduled successfully", candidate });
    } catch (error) {
        console.error("POST INTERVIEW ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        const { candidateId, interviewId, updateData } = body;

        if (!candidateId || !interviewId) {
            return NextResponse.json({ error: "Missing required identifiers" }, { status: 400 });
        }

        console.log("PUT INTERVIEW UPDATE RECEIVED:", { candidateId, interviewId, decision: updateData.decision });

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            console.error("CANDIDATE NOT FOUND:", candidateId);
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        console.log("CANDIDATE FOUND:", candidate.name, "Current Status:", candidate.status);

        // Update the specific interview in the array
        const interviewIndex = candidate.interviews.findIndex(i => i._id.toString() === interviewId);
        if (interviewIndex === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

        const originalInterview = candidate.interviews[interviewIndex];
        const decision = updateData.decision;

        // Merge updates
        candidate.interviews[interviewIndex] = {
            ...originalInterview.toObject(),
            ...updateData
        };

        // Decision-Driven Pipeline Updates
        // --- PIPELINE AUTOMATION LOGIC ---
        // 1. Handle Promotion (Next Stage)
        if (updateData.decision === 'Promoted') {
            const rounds = ['Applied', 'Screening', 'Technical Interview', 'Managerial Interview', 'HR Interview', 'Offer Sent', 'Hired'];
            const currentIndex = rounds.indexOf(candidate.status);
            if (currentIndex !== -1 && currentIndex < rounds.length - 1) {
                candidate.status = rounds[currentIndex + 1];
            }
        }

        // 2. Handle Rejection (Closed)
        if (updateData.decision === 'Rejected') {
            candidate.status = 'Rejected';
            try {
                const { sendEmail } = await import('@/lib/email/service');
                const { getRejectionEmailTemplate } = await import('@/lib/email/templates/recruitment');
                
                await sendEmail({
                    to: candidate.email,
                    subject: `Update regarding your application - ${candidate.appliedRole || 'Team Member'}`,
                    html: getRejectionEmailTemplate(
                        candidate.name || 'Candidate', 
                        candidate.appliedRole || 'Team Member'
                    )
                });
            } catch (err) {
                console.error("Auto-rejection email failed:", err);
            }
        }

        // 3. Handle Hiring & Offers
        if (updateData.decision === 'Hired' || updateData.decision === 'Offer Sent') {
            candidate.status = updateData.decision;
            
            try {
                const { sendEmail } = await import('@/lib/email/service');
                const { getOfferLetterEmailTemplate } = await import('@/lib/email/templates/recruitment');
                const { generateOfferLetter } = await import('@/lib/pdf/offer-generator');

                console.log("GENERATING OFFER FOR:", candidate.name);
                const pdfDataUri = generateOfferLetter({
                    candidateName: candidate.name || 'Candidate',
                    jobTitle: candidate.appliedRole || 'Team Member',
                    salary: "As per Discussion",
                    joiningDate: "Immediate"
                });

                const attachments = [];
                if (pdfDataUri && pdfDataUri.includes('base64,')) {
                    attachments.push({
                        filename: `Offer_Letter_${(candidate.name || 'Candidate').replace(/\s+/g, '_')}.pdf`,
                        content: pdfDataUri.split('base64,')[1],
                        encoding: 'base64'
                    });
                }

                console.log("SENDING EMAIL TO:", candidate.email, "Attachments:", attachments.length);
                const emailResult = await sendEmail({
                    to: candidate.email,
                    subject: `Offer Letter: ${candidate.appliedRole || 'Team Member'} position at Bizmate Technologies`,
                    html: getOfferLetterEmailTemplate(
                        candidate.name || 'Candidate', 
                        candidate.appliedRole || 'Team Member',
                        null,
                        candidateId,
                        candidate.email
                    ),
                    attachments
                });
                console.log("EMAIL RESULT:", emailResult.success ? "SUCCESS" : "FAILED", emailResult.error || "");
            } catch (err) {
                console.error("CRITICAL OFFER ERROR:", err);
            }
        } else if (updateData.decision === 'On Hold') {
            candidate.status = 'On Hold';
        }

            // Mark as modified for Mongoose tracking
            candidate.markModified('interviews');
            console.log("INTERVIEW RECORD UPDATED:", interviewId);

        console.log("SAVING CANDIDATE:", candidate.name, "Final Status:", candidate.status);
        await candidate.save();
        
        return NextResponse.json({ 
            success: true, 
            message: `Decision '${updateData.decision}' processed successfully`,
            newStatus: candidate.status 
        });
    } catch (error) {
        console.error("PUT INTERVIEW ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
