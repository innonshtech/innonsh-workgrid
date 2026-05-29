import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/db/connect';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { parseResumeFromPDF, calculateFitScore } from '@/lib/ai/gemini';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';

    const query = { organizationId: authUser.organizationId };

    if (skill) {
      query["parsedResume.skills"] = { $regex: new RegExp(`^${skill}$`, 'i') };
    } else if (search) {
      // Robust multi-field text search (search by skills, name, current role, or summary)
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { "parsedResume.skills": { $regex: search, $options: 'i' } },
        { "parsedResume.currentRole": { $regex: search, $options: 'i' } },
        { "parsedResume.summary": { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await StaffingCandidate.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, candidates });
  } catch (error) {
    console.error("GET CANDIDATES ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "recruiter"]);
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: "No resume file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse Resume using Gemini's native document understanding
    console.log("Parsing resume with Gemini...");
    const parsedData = await parseResumeFromPDF(buffer, file.type || 'application/pdf');

    if (!parsedData) {
      return NextResponse.json({ success: false, error: "AI failed to parse the resume document." }, { status: 500 });
    }

    const orgId = authUser.organizationId;
    const email = (parsedData.email || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ success: false, error: "Could not extract a valid email address from the resume." }, { status: 422 });
    }

    // 2. Check for duplicate candidate
    const existing = await StaffingCandidate.findOne({ email, organizationId: orgId });
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Candidate with email ${email} already exists in the talent pool.`,
        candidate: existing
      }, { status: 409 });
    }

    // 3. Save PDF file locally
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'staffing', 'resumes');
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    const resumeUrl = `/uploads/staffing/resumes/${fileName}`;

    // 4. Create StaffingCandidate in DB
    const candidate = await StaffingCandidate.create({
      name: parsedData.name || file.name.split('.')[0],
      email,
      phone: parsedData.phone || "",
      resumeUrl,
      status: "available",
      parsedResume: {
        skills: parsedData.skills || [],
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        summary: parsedData.summary || "",
        totalExperienceYears: parsedData.totalExperienceYears || 0,
        currentRole: parsedData.currentRole || "",
        currentCompany: parsedData.currentCompany || ""
      },
      organizationId: orgId
    });

    // 5. Run "Instant Match" against all currently open requirements
    console.log("Running instant match against open requirements...");
    const openRequirements = await StaffingRequirement.find({
      status: 'open',
      organizationId: orgId
    }).populate('clientId', 'name');

    const matchPromises = openRequirements.map(async (req) => {
      try {
        const fitAnalysis = await calculateFitScore(candidate.parsedResume, req);
        return {
          requirement: {
            _id: req._id,
            title: req.title,
            clientName: req.clientId?.name
          },
          fitScore: fitAnalysis.fitScore || 0,
          analysis: fitAnalysis.analysis || "",
          strengths: fitAnalysis.strengths || [],
          gaps: fitAnalysis.gaps || [],
          recommendation: fitAnalysis.recommendation || "Pending Review"
        };
      } catch (err) {
        console.error(`AI matching error for requirement ${req._id}:`, err);
        return null;
      }
    });

    const instantMatches = (await Promise.all(matchPromises))
      .filter(Boolean)
      .sort((a, b) => b.fitScore - a.fitScore);

    return NextResponse.json({
      success: true,
      candidate,
      instantMatches,
      message: "Resume uploaded, parsed, and matched successfully!"
    }, { status: 201 });

  } catch (error) {
    console.error("POST CANDIDATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
