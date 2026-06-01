import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import mongoose from 'mongoose';
import StaffingClient from '@/lib/db/models/staffing/StaffingClient';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import StaffingSubmission from '@/lib/db/models/staffing/StaffingSubmission';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
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
      recentCandidates,
      employees,
      users,
      uploadsGroupByRecruiter
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
        .limit(5),
      Employee.find({ role: "recruiter", "jobDetails.organizationId": authUser.organizationId }, 'personalDetails.firstName personalDetails.lastName personalDetails.email jobDetails.designation').lean(),
      User.find({ role: "recruiter", organizationId: authUser.organizationId }, 'name email').lean(),
      StaffingCandidate.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(authUser.organizationId), uploadedBy: { $ne: null } } },
        { $group: { _id: "$uploadedBy", count: { $sum: 1 } } }
      ])
    ]);

    // Build upload count map
    const uploadCountsMap = new Map(
      uploadsGroupByRecruiter.map(group => [group._id.toString(), group.count])
    );

    // Build list of recruiters with resume counts
    const recruitersList = [];

    employees.forEach(emp => {
      const empIdStr = emp._id.toString();
      const fullName = `${emp.personalDetails?.firstName || ''} ${emp.personalDetails?.lastName || ''}`.trim() || "Recruiter";
      recruitersList.push({
        _id: empIdStr,
        name: fullName,
        email: emp.personalDetails?.email || "",
        designation: emp.jobDetails?.designation || "HR Recruiter",
        candidatesCount: uploadCountsMap.get(empIdStr) || 0
      });
    });

    users.forEach(usr => {
      const usrIdStr = usr._id.toString();
      if (!recruitersList.some(r => r._id === usrIdStr)) {
        recruitersList.push({
          _id: usrIdStr,
          name: usr.name || "Recruiter",
          email: usr.email || "",
          designation: "Recruiter Admin",
          candidatesCount: uploadCountsMap.get(usrIdStr) || 0
        });
      }
    });

    const recruitersCount = recruitersList.length;

    // Resolve uploader names dynamically for recentCandidates
    const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id.toString());
    const uploaderIds = [...new Set(recentCandidates.map(c => c.uploadedBy).filter(isValidObjectId).map(id => id.toString()))];
    const uploaderMap = new Map();

    if (uploaderIds.length > 0) {
      const [recentEmployees, recentUsers] = await Promise.all([
        Employee.find({ _id: { $in: uploaderIds } }, 'personalDetails.firstName personalDetails.lastName role').lean(),
        User.find({ _id: { $in: uploaderIds } }, 'name role').lean()
      ]);

      recentEmployees.forEach(emp => {
        const fullName = `${emp.personalDetails?.firstName || ''} ${emp.personalDetails?.lastName || ''}`.trim();
        if (emp.role === 'recruiter') {
          uploaderMap.set(emp._id.toString(), fullName || "Recruiter");
        } else {
          uploaderMap.set(emp._id.toString(), `Uploaded by Admin`);
        }
      });

      recentUsers.forEach(usr => {
        if (usr.role === 'recruiter') {
          uploaderMap.set(usr._id.toString(), usr.name || "Recruiter");
        } else {
          uploaderMap.set(usr._id.toString(), `Uploaded by Admin`);
        }
      });
    }

    const recentCandidatesWithUploader = recentCandidates.map(c => {
      const candidateObj = c.toObject();
      candidateObj.uploadedByName = c.uploadedBy 
        ? (uploaderMap.get(c.uploadedBy.toString()) || "Uploaded by Admin") 
        : "Uploaded by Admin";
      return candidateObj;
    });

    return NextResponse.json({
      success: true,
      stats: {
        activeClients: clientsCount,
        openRequirements: requirementsCount,
        totalCandidates: candidatesCount,
        activeSubmissions: submissionsCount,
        totalDeployments: deploymentsCount,
        recruitersCount
      },
      recentSubmissions,
      recentCandidates: recentCandidatesWithUploader,
      recruiters: recruitersList
    });
  } catch (error) {
    console.error("GET STAFFING DASHBOARD STATS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
