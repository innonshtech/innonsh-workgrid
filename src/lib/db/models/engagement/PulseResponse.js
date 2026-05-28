import mongoose from 'mongoose';

const responseAnswerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    answer: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
}, { _id: false });

const pulseResponseSchema = new mongoose.Schema({
    surveyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PulseSurvey',
        required: true,
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    responses: [responseAnswerSchema],
    engagementScore: {
        type: Number,
        min: 0,
        max: 10,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Calculate engagement score before saving if possible (assuming rating is 1-5)
pulseResponseSchema.pre('save', function (next) {
    const ratingResponses = this.responses.filter(r => typeof r.answer === 'number');
    if (ratingResponses.length > 0) {
        const total = ratingResponses.reduce((sum, r) => sum + r.answer, 0);
        // Convert 1-5 scale to 1-10 if needed, or keep it consistent
        this.engagementScore = (total / ratingResponses.length) * 2; // Normalize to 10
    }
    next();
});

export default mongoose.models.PulseResponse || mongoose.model('PulseResponse', pulseResponseSchema);
