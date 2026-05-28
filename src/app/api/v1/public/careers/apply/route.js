import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import { processCandidateResumeInBackground } from '@/lib/recruitment/resume-processing';
import fs from 'fs/promises';
import path from 'path';

async function scheduleAfterResponse(fn) {
  try {
    const mod = await import('next/server');
    const afterFn = mod.after || mod.unstable_after;
    if (typeof afterFn === 'function') {
      afterFn(fn);
      return;
    }
  } catch {
    // ignore
  }

  setTimeout(() => {
    try {
      fn();
    } catch {
      // ignore
    }
  }, 0);
}

export async function POST(request) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const jobId = formData.get('jobId');
    const resumeFile = formData.get('resume');

    if (!name || !email || !jobId) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and Job ID are required' },
        { status: 400 }
      );
    }

    const job = await JobRequisition.findById(jobId);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

    const existing = await Candidate.findOne({
      email: String(email).toLowerCase(),
      organizationId: job.organizationId,
      jobRequisition: jobId
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists for this position' },
        { status: 400 }
      );
    }

    let resumeUrl = null;

    // 1) Save the PDF file to public/uploads/resumes (fast)
    if (resumeFile && typeof resumeFile.arrayBuffer === 'function') {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const fileName = `resume_${Date.now()}_${String(name).replace(/\s+/g, '_').toLowerCase()}.pdf`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
      const filePath = path.join(uploadDir, fileName);

      try {
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(filePath, buffer);
        resumeUrl = `/uploads/resumes/${fileName}`;
      } catch (fsErr) {
        console.error('Failed to save resume locally:', fsErr?.message || fsErr);
      }
    }

    // 2) Create candidate immediately (no AI work here)
    const candidate = await Candidate.create({
      name,
      email,
      phone,
      jobRequisition: jobId,
      organizationId: job.organizationId,
      source: 'Careers Portal',
      status: 'Applied',
      resumeUrl,
      resumeParseStatus: resumeUrl ? 'queued' : 'failed',
      resumeParseRequestedAt: resumeUrl ? new Date() : null,
      resumeParseError: resumeUrl ? null : 'Resume file missing or failed to save'
    });

    const candidateId = String(candidate._id);

    // 3) Background tasks (won't block the user)
    if (resumeUrl) {
      void scheduleAfterResponse(() => processCandidateResumeInBackground(candidateId));
    }

    void scheduleAfterResponse(async () => {
      try {
        const { sendEmail } = await import('@/lib/email/service');
        const { getApplicationReceivedTemplate } = await import('@/lib/email/templates/recruitment');

        await sendEmail({
          to: email,
          subject: `Application Received — ${job?.title || 'the open position'}`,
          html: getApplicationReceivedTemplate(name, job?.title || 'the open position')
        });
      } catch (emailErr) {
        console.warn('Email skipping (SMTP not configured):', emailErr?.message || emailErr);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully',
        candidateId,
        applicationId: candidateId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('APPLY API ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

