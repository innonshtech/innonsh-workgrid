import mongoose from 'mongoose';

const interviewFeedbackSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    interviewId: {
        type: String,
        required: true
    },
    round: {
        type: String,
        default: 'Technical Interview'
    },
    interviewerName: String,
    rawNotes: {
        type: String,
        required: true
    },
    structuredFeedback: {
        technicalSkills: {
            rating: { type: Number, min: 1, max: 5 },
            notes: String
        },
        communication: {
            rating: { type: Number, min: 1, max: 5 },
            notes: String
        },
        problemSolving: {
            rating: { type: Number, min: 1, max: 5 },
            notes: String
        },
        cultureFit: {
            rating: { type: Number, min: 1, max: 5 },
            notes: String
        },
        overallRating: { type: Number, min: 1, max: 5 },
        summary: String,
        recommendation: {
            type: String,
            enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire']
        },
        strengths: [String],
        concerns: [String]
    },
    aiProcessed: {
        type: Boolean,
        default: false
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    }
}, {
    timestamps: true
});

const InterviewFeedback = mongoose.models.InterviewFeedback || mongoose.model('InterviewFeedback', interviewFeedbackSchema);

export default InterviewFeedback;
