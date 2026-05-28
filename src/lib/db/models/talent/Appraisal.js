import mongoose from "mongoose";

const appraisalSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    period: {
        type: String, // e.g., "Annual 2025", "Q1 2026"
        required: true
    },
    startDate: Date,
    endDate: Date,
    status: {
        type: String,
        enum: ['Draft', 'Self-Appraisal', 'Manager-Review', 'Completed', 'Acknowledged'],
        default: 'Draft'
    },
    selfRatings: [{
        category: String,
        score: Number, // 1-5
        comment: String
    }],
    managerRatings: [{
        category: String,
        score: Number, // 1-5
        comment: String
    }],
    peerRatings: [{
        category: String,
        score: Number, // 1-5
        comment: String,
        peer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    overallScore: {
        type: Number,
        default: 0
    },
    employeeStrengths: [String],
    improvementAreas: [String],
    employeeComments: String,
    managerComments: String,
    finalReviewDate: Date
}, {
    timestamps: true
});

const Appraisal = mongoose.models.Appraisal || mongoose.model("Appraisal", appraisalSchema);
export default Appraisal;
