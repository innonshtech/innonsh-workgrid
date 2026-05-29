import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import StaffingClient from '@/lib/db/models/staffing/StaffingClient';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import StaffingSubmission from '@/lib/db/models/staffing/StaffingSubmission';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const orgQuery = { organizationId: authUser.organizationId };

    // Fetch all stats concurrently to avoid blocking
    const [
      clientsCount,
      requirementsCount,
      candidatesCount,
      submissionsCount,
      deploymentsCount,
      recentSubmissions,
      recentCandidates
    ] = await Promise.all([
      StaffingClient.countDocuments({ ...orgQuery, status: "active" }),
      StaffingRequirement.countDocuments({ ...orgQuery, status: "open" }),
      StaffingCandidate.countDocuments(orgQuery),
      StaffingSubmission.countDocuments({ ...orgQuery, stage: { $nin: ["deployed", "rejected", "withdrawn"] } }),
      StaffingSubmission.countDocuments({ ...orgQuery, stage: "deployed" }),
      StaffingSubmission.find(orgQuery)
        .populate('candidateId', 'name email')
        .populate('requirementId', 'title')
        .sort({ createdAt: -1 })
        .limit(5),
      StaffingCandidate.find(orgQuery)
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        activeClients: clientsCount,
        openRequirements: requirementsCount,
        totalCandidates: candidatesCount,
        activeSubmissions: submissionsCount,
        totalDeployments: deploymentsCount
      },
      recentSubmissions,
      recentCandidates
    });
  } catch (error) {
    console.error("GET STAFFING DASHBOARD STATS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
