import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/db/connect';
import StaffingCandidate from '@/lib/db/models/staffing/StaffingCandidate';
import StaffingRequirement from '@/lib/db/models/staffing/StaffingRequirement';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { parseResumeFromPDF, calculateFitScore } from '@/lib/ai/gemini';
import cloudinary from '@/lib/cloudinary';

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

    // Resolve uploader names dynamically
    const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id.toString());
    const uploaderIds = [...new Set(candidates.map(c => c.uploadedBy).filter(isValidObjectId).map(id => id.toString()))];
    const uploaderMap = new Map();

    if (uploaderIds.length > 0) {
      const [employees, users] = await Promise.all([
        Employee.find({ _id: { $in: uploaderIds } }, 'personalDetails.firstName personalDetails.lastName role').lean(),
        User.find({ _id: { $in: uploaderIds } }, 'name role').lean()
      ]);

      employees.forEach(emp => {
        const fullName = `${emp.personalDetails?.firstName || ''} ${emp.personalDetails?.lastName || ''}`.trim();
        if (emp.role === 'recruiter') {
          uploaderMap.set(emp._id.toString(), fullName || "Recruiter");
        } else {
          uploaderMap.set(emp._id.toString(), `Uploaded by Admin`);
        }
      });

      users.forEach(usr => {
        if (usr.role === 'recruiter') {
          uploaderMap.set(usr._id.toString(), usr.name || "Recruiter");
        } else {
          uploaderMap.set(usr._id.toString(), `Uploaded by Admin`);
        }
      });
    }

    const candidateList = candidates.map(c => {
      const candidateObj = c.toObject();
      candidateObj.uploadedByName = c.uploadedBy 
        ? (uploaderMap.get(c.uploadedBy.toString()) || "Uploaded by Admin") 
        : "Uploaded by Admin";
      return candidateObj;
    });

    return NextResponse.json({ success: true, candidates: candidateList });
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
    let parsedData = null;
    try {
      parsedData = await parseResumeFromPDF(buffer, file.type || 'application/pdf');
    } catch (parseError) {
      if (parseError.name === 'GoogleAPIError') {
        return NextResponse.json({ 
          success: false, 
          errorType: 'GOOGLE_API_KEY_ERROR', 
          error: parseError.message 
        }, { status: 500 });
      }
      throw parseError; // Re-throw generic errors to catch block below
    }

    // If AI parsing completely fails, we gracefully fallback so the upload isn't blocked
    if (!parsedData) {
      console.warn("AI failed to parse the resume document. Falling back to basic file upload.");
      parsedData = {
        name: file.name.split('.')[0],
        email: `no-email-${Date.now()}@placeholder.com`,
        phone: "",
        skills: [],
        experience: [],
        education: [],
        summary: "AI Parsing Failed or Unavailable.",
        totalExperienceYears: 0,
        currentRole: "",
        currentCompany: ""
      };
    }

    const orgId = authUser.organizationId;
    let email = (parsedData.email || '').toLowerCase().trim();

    // Fallback if AI misses the email specifically
    if (!email) {
      email = `no-email-${Date.now()}@placeholder.com`;
      console.warn("AI missed email. Using placeholder: ", email);
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
    const fileName = `resume_${Date.now()}_${(parsedData.name || file.name.split('.')[0]).replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
    const filePath = path.join(uploadDir, fileName);
    let resumeUrl = `/uploads/resumes/${fileName}`;

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, buffer);
      console.log("Resume saved locally at:", resumeUrl);
    } catch (fsErr) {
      console.error('Failed to save resume locally:', fsErr?.message || fsErr);
    }

    // Optional: Save PDF file to Cloudinary (background/backup)
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_SECRET) {
      try {
        console.log("Uploading resume to Cloudinary as backup...");
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: "staffing/resumes",
              resource_type: "auto",
              public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').split('.')[0]}`
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary backup upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });
        
        if (uploadResult && uploadResult.secure_url) {
          resumeUrl = uploadResult.secure_url;
          console.log("Using Cloudinary URL for resume:", resumeUrl);
        }
      } catch (cloudinaryErr) {
        console.warn("Cloudinary backup upload failed, continuing with local storage:", cloudinaryErr);
      }
    }

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
      organizationId: orgId,
      uploadedBy: authUser.id
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
          recommendation: fitAnalysis.recommendation || "Pending Review",
          success: true
        };
      } catch (err) {
        console.error(`AI matching error for requirement ${req._id}:`, err);
        return {
          requirement: {
            _id: req._id,
            title: req.title,
            clientName: req.clientId?.name
          },
          success: false,
          errorType: err.name === 'GoogleAPIError' ? 'GOOGLE_API_KEY_ERROR' : 'UNKNOWN_ERROR',
          errorMessage: err.message
        };
      }
    });

    const matchResults = await Promise.all(matchPromises);
    const instantMatches = matchResults.filter(m => m.success).sort((a, b) => b.fitScore - a.fitScore);
    const failedMatches = matchResults.filter(m => !m.success);

    return NextResponse.json({
      success: true,
      candidate,
      instantMatches,
      failedMatches,
      message: "Resume uploaded, parsed, and matched successfully!"
    }, { status: 201 });

  } catch (error) {
    console.error("POST CANDIDATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
