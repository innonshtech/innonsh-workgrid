import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { calculateFitScore } from '@/lib/ai/gemini';

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const body = await request.json();
    const { requirementId } = body;

    if (!requirementId) {
      return NextResponse.json({ success: false, error: "Requirement ID is required" }, { status: 400 });
    }

    // 1. Fetch requirement details
    const requirement = await StaffingRequirement.findOne({
      _id: requirementId,
      organizationId: authUser.organizationId
    });

    if (!requirement) {
      return NextResponse.json({ success: false, error: "Requirement not found" }, { status: 404 });
    }

    // 2. Stage 1: Mongoose DB Filter (Free & Instant)
    const query = { organizationId: authUser.organizationId };

    // Skill overlap filter (Loosened to allow partial matches)
    if (requirement.skillsRequired && requirement.skillsRequired.length > 0) {
      // Use just the first word of the skill for broader matching (e.g. "ReactJS" -> "React")
      const regexes = requirement.skillsRequired.map(skill => {
        const baseWord = skill.trim().split(/[\s-]/)[0];
        return new RegExp(baseWord, 'i');
      });
      query["parsedResume.skills"] = { $in: regexes };
    }

    // Experience filter (optional, allow ± 2 years of leniency)
    if (requirement.minExperience > 0) {
      query["parsedResume.totalExperienceYears"] = { $gte: Math.max(0, requirement.minExperience - 2) };
    }

    console.log(`AI Match Stage 1: Filtered query returned. Fetching candidates...`);
    let candidates = await StaffingCandidate.find(query);

    // If filter was too strict and returned no candidates, fall back to fetching all available candidates
    if (candidates.length === 0) {
      console.log("Stage 1 filter too strict, falling back to all available candidates.");
      candidates = await StaffingCandidate.find({
        organizationId: authUser.organizationId,
        status: "available"
      });
    }

    // Cap the AI evaluations to a maximum of 25 candidates to avoid rate limits and keep it light
    const isCapped = candidates.length > 25;
    const candidatesToScore = candidates.slice(0, 25);
    console.log(`AI Match Stage 2: Scoring ${candidatesToScore.length} candidates using Gemini...`);

    // 3. Stage 2: Run AI Matching in Parallel
    const matchPromises = candidatesToScore.map(async (candidate) => {
      try {
        const fitAnalysis = await calculateFitScore(candidate.parsedResume, requirement);
        return {
          candidate: {
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            resumeUrl: candidate.resumeUrl,
            parsedResume: candidate.parsedResume
          },
          fitScore: fitAnalysis.fitScore || 0,
          analysis: fitAnalysis.analysis || "",
          strengths: fitAnalysis.strengths || [],
          gaps: fitAnalysis.gaps || [],
          recommendation: fitAnalysis.recommendation || "Pending Review",
          success: true
        };
      } catch (err) {
        console.error(`AI Scoring failed for candidate ${candidate._id}:`, err);
        return {
          candidate: {
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email
          },
          success: false,
          errorType: err.name === 'GoogleAPIError' ? 'GOOGLE_API_KEY_ERROR' : 'UNKNOWN_ERROR',
          errorMessage: err.message
        };
      }
    });

    const matchResults = await Promise.all(matchPromises);
    const matches = matchResults.filter(m => m.success).sort((a, b) => b.fitScore - a.fitScore);
    const failedMatches = matchResults.filter(m => !m.success);

    return NextResponse.json({
      success: true,
      requirement,
      matches,
      failedMatches,
      totalScored: matches.length,
      cappedAt25: isCapped
    });

  } catch (error) {
    console.error("AI MATCHING API ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
