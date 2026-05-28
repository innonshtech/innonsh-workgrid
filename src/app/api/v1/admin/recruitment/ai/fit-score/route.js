import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { calculateFitScore } from '@/lib/ai/gemini';

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();

        const body = await request.json();
        const { candidateId, jobId } = body;

        if (!candidateId) {
            return NextResponse.json({ success: false, error: "Candidate ID is required" }, { status: 400 });
        }

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
        }

        // Get job requirements
        let jobRequirements = {};
        if (jobId) {
            const job = await JobRequisition.findById(jobId);
            if (job) {
                jobRequirements = {
                    title: job.title,
                    department: job.department,
                    description: job.description,
                    requirements: job.requirements,
                    skillsRequired: job.skillsRequired
                };
            }
        } else if (candidate.jobRequisition) {
            const job = await JobRequisition.findById(candidate.jobRequisition);
            if (job) {
                jobRequirements = {
                    title: job.title,
                    department: job.department,
                    description: job.description,
                    requirements: job.requirements,
                    skillsRequired: job.skillsRequired
                };
            }
        }

        // Build candidate profile from parsed resume or basic info
        const candidateProfile = {
            skills: candidate.parsedResume?.skills || [],
            totalExperienceYears: candidate.parsedResume?.totalExperienceYears || 0,
            currentRole: candidate.parsedResume?.currentRole || candidate.appliedRole || '',
            education: candidate.parsedResume?.education || [],
            summary: candidate.parsedResume?.summary || candidate.notes || ''
        };

        const result = await calculateFitScore(candidateProfile, jobRequirements);

        // Save fit score to candidate
        candidate.fitScore = result.fitScore;
        candidate.fitAnalysis = result.analysis;
        candidate.fitRecommendation = result.recommendation;
        candidate.fitStrengths = result.strengths || [];
        candidate.fitGaps = result.gaps || [];
        await candidate.save();

        return NextResponse.json({
            success: true,
            data: result,
            message: `Fit score calculated: ${result.fitScore}/100`
        });
    } catch (error) {
        console.error("AI FIT SCORE ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
