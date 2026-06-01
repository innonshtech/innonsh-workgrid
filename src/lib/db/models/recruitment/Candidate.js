import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Candidate name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    phone: String,
    resumeUrl: String,
    resumeText: String,
    resumeParseStatus: {
        type: String,
        enum: ['queued', 'processing', 'done', 'failed', null],
        default: null
    },
    resumeParseRequestedAt: Date,
    resumeParsedAt: Date,
    resumeParseAttempts: {
        type: Number,
        default: 0
    },
    resumeParseError: String,
    jobRequisition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobRequisition',
        required: false
    },
    appliedRole: String,
    status: {
        type: String,
        enum: [
            'Applied',
            'Screening',
            'Interviewing',
            'Offer Sent',
            'Hired',
            'Confirmed',
            'Declined',
            'Rejected',
            'Withdrawn',
            'On Hold',
            'Draft'
        ],
        default: 'Applied'
    },
    isOnHold: {
        type: Boolean,
        default: false
    },
    interviews: [{
        round: String,
        interviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    date: Date,
    mode: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
    location: String,
    meetingLink: String,
    rawNotes: String, // Original interviewer input
    structuredFeedback: mongoose.Schema.Types.Mixed, // AI-generated JSON
    decision: { 
        type: String, 
        enum: ['Promoted', 'Rejected', 'Hired', 'Offer Sent', 'On Hold', 'Saved', null],
        default: null 
    },
    feedback: String, // Legacy summary field
    rating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
}],
    source: {
        type: String,
        enum: ['LinkedIn', 'Indeed', 'Referral', 'Website', 'Careers Portal', 'Other'],
        default: 'Website'
    },
    notes: String,
    parsedResume: {
        skills: [String],
        experience: [{
            company: String,
            role: String,
            duration: String,
            years: Number,
            highlights: [String]
        }],
        education: [{
            institution: String,
            degree: String,
            year: String
        }],
        summary: String,
        totalExperienceYears: Number,
        currentRole: String,
        currentCompany: String
    },
    fitScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    fitAnalysis: String,
    fitRecommendation: {
        type: String,
        enum: ['Strong Hire', 'Potential Fit', 'Weak Match', 'Not Recommended', 'Pending Review', 'Needs Review', null],
        default: 'Pending Review'
    },
    fitStrengths: [String],
    fitGaps: [String],
    appliedDate: {
        type: Date,
        default: Date.now
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    }
}, {
    timestamps: true
});

// Gap Fix #9: Prevent duplicate candidates by email within same organization for the SAME role
candidateSchema.index({ email: 1, organizationId: 1, jobRequisition: 1 }, { unique: true });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

export default Candidate;
