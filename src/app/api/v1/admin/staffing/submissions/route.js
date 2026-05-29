import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingSubmission from '@/lib/db/models/staffing/StaffingSubmission';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get('requirementId');
    const stage = searchParams.get('stage');

    const query = { organizationId: authUser.organizationId };
    if (requirementId) query.requirementId = requirementId;
    if (stage) query.stage = stage;

    const submissions = await StaffingSubmission.find(query)
      .populate('candidateId', 'name email phone resumeUrl status parsedResume')
      .populate({
        path: 'requirementId',
        select: 'title minExperience maxExperience budgetRange clientId',
        populate: {
          path: 'clientId',
          select: 'name contactPerson email phone'
        }
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("GET SUBMISSIONS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const body = await request.json();
    const {
      candidateId,
      requirementId,
      stage,
      fitScore,
      fitAnalysis,
      fitStrengths,
      fitGaps,
      fitRecommendation,
      notes
    } = body;

    if (!candidateId || !requirementId) {
      return NextResponse.json({ success: false, error: "Candidate ID and Requirement ID are required" }, { status: 400 });
    }

    // Check duplicate submission
    const existing = await StaffingSubmission.findOne({
      candidateId,
      requirementId,
      organizationId: authUser.organizationId
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: "This candidate has already been submitted for this client requirement."
      }, { status: 409 });
    }

    // Update candidate status to "interviewing" on submission
    await StaffingCandidate.findByIdAndUpdate(candidateId, { status: "interviewing" });

    const submission = await StaffingSubmission.create({
      candidateId,
      requirementId,
      stage: stage || "submitted",
      fitScore: fitScore || 0,
      fitAnalysis: fitAnalysis || "",
      fitStrengths: fitStrengths || [],
      fitGaps: fitGaps || [],
      fitRecommendation: fitRecommendation || "Pending Review",
      notes: notes || "",
      statusHistory: [{
        stage: stage || "submitted",
        changedBy: authUser.id,
        notes: notes || "Initial candidate submission to client"
      }],
      organizationId: authUser.organizationId
    });

    return NextResponse.json({ success: true, submission, message: "Candidate submitted to requirement successfully" }, { status: 201 });
  } catch (error) {
    console.error("POST SUBMISSION ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const body = await request.json();
    const { id, stage, notes } = body;

    if (!id || !stage) {
      return NextResponse.json({ success: false, error: "Submission ID and new stage are required" }, { status: 400 });
    }

    const submission = await StaffingSubmission.findOne({
      _id: id,
      organizationId: authUser.organizationId
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    const prevStage = submission.stage;
    submission.stage = stage;
    submission.statusHistory.push({
      stage,
      changedBy: authUser.id,
      notes: notes || `Pipeline transitioned from ${prevStage} to ${stage}`
    });

    if (notes) {
      submission.notes = notes;
    }

    await submission.save();

    // Side-effects: sync candidate availability
    if (stage === "deployed") {
      await StaffingCandidate.findByIdAndUpdate(submission.candidateId, { status: "deployed" });
    } else if (stage === "rejected" || stage === "withdrawn") {
      // Revert candidate back to available if they are rejected or withdraw
      await StaffingCandidate.findByIdAndUpdate(submission.candidateId, { status: "available" });
    }

    return NextResponse.json({ success: true, submission, message: `Hiring stage updated to ${stage}` });
  } catch (error) {
    console.error("PUT SUBMISSION ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
