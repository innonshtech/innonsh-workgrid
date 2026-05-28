import dbConnect from '@/lib/db/connect';
import Candidate from '@/lib/db/models/recruitment/Candidate';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import { parseResumeFromPDF, calculateFitScore } from '@/lib/ai/gemini';
import fs from 'fs/promises';
import path from 'path';

function resumeUrlToAbsolutePath(resumeUrl) {
  if (!resumeUrl || typeof resumeUrl !== 'string') return null;
  const clean = resumeUrl.replace(/^[\\/]+/, '');
  return path.join(process.cwd(), 'public', clean);
}

export async function processCandidateResumeInBackground(candidateId) {
  if (!candidateId) return;

  try {
    await dbConnect();

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return;

    if (candidate.resumeParseStatus === 'processing' || candidate.resumeParseStatus === 'done') {
      return;
    }

    candidate.resumeParseStatus = 'processing';
    candidate.resumeParseError = null;
    candidate.resumeParseAttempts = (candidate.resumeParseAttempts || 0) + 1;
    await candidate.save();

    const resumePath = resumeUrlToAbsolutePath(candidate.resumeUrl);
    if (!resumePath) {
      throw new Error('Missing resumeUrl for candidate');
    }

    const buffer = await fs.readFile(resumePath);
    if (!buffer || buffer.length === 0) {
      throw new Error('Resume file is empty');
    }

    const aiResult = await parseResumeFromPDF(buffer, 'application/pdf');
    if (!aiResult) {
      throw new Error('AI resume parsing returned empty result');
    }

    const resumeText = aiResult.rawText || '';
    delete aiResult.rawText;

    let fitScore = candidate.fitScore ?? 0;
    let fitAnalysis = candidate.fitAnalysis || 'Analysis pending...';
    let fitRecommendation = candidate.fitRecommendation || 'Pending Review';
    let fitStrengths = candidate.fitStrengths || [];
    let fitGaps = candidate.fitGaps || [];

    if (candidate.jobRequisition) {
      const job = await JobRequisition.findById(candidate.jobRequisition);
      if (job) {
        const candidateProfile = {
          skills: aiResult.skills || [],
          totalExperienceYears: aiResult.totalExperienceYears || 0,
          currentRole: aiResult.currentRole || '',
          education: aiResult.education || [],
          summary: aiResult.summary || '',
          rawText: resumeText
        };

        const jobRequirements = {
          title: job.title || 'N/A',
          department: job.department || 'N/A',
          description: job.description || 'N/A',
          requirements: job.requirements || [],
          skillsRequired: job.skillsRequired || []
        };

        const fitResult = await calculateFitScore(candidateProfile, jobRequirements);
        if (fitResult) {
          fitScore = fitResult.fitScore || 0;
          fitAnalysis = fitResult.analysis || '';
          fitRecommendation = fitResult.recommendation || 'Weak Match';
          fitStrengths = fitResult.strengths || [];
          fitGaps = fitResult.gaps || [];
        }
      }
    }

    await Candidate.findByIdAndUpdate(candidateId, {
      parsedResume: aiResult,
      resumeText,
      fitScore,
      fitAnalysis,
      fitRecommendation,
      fitStrengths,
      fitGaps,
      resumeParseStatus: 'done',
      resumeParsedAt: new Date(),
      resumeParseError: null
    });
  } catch (err) {
    try {
      await dbConnect();
      await Candidate.findByIdAndUpdate(candidateId, {
        resumeParseStatus: 'failed',
        resumeParseError: err?.message || String(err)
      });
    } catch {
      // best-effort only
    }
  }
}

