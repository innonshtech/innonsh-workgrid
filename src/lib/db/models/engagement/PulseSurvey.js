import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['rating', 'text', 'boolean'],
        default: 'rating',
    },
    required: {
        type: Boolean,
        default: true,
    },
    options: [String], // For multiple choice if needed in future
}, { _id: true });

const pulseSurveySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    questions: [questionSchema],
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Closed'],
        default: 'Draft',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    activeUntil: {
        type: Date,
    },
    isAnonymous: {
        type: Boolean,
        default: false,
    },
    isEnps: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

export default mongoose.models.PulseSurvey || mongoose.model('PulseSurvey', pulseSurveySchema);
