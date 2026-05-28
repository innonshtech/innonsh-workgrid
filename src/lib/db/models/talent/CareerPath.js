import mongoose from "mongoose";

const careerPathSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    currentDesignation: String,
    targetDesignation: String,
    visionStatement: String,
    milestones: [{
        title: String,
        description: String,
        targetDate: Date,
        status: {
            type: String,
            enum: ['Planned', 'Achieved', 'Missed'],
            default: 'Planned'
        },
        completionDate: Date,
        requiredSkills: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill'
        }]
    }],
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const CareerPath = mongoose.models.CareerPath || mongoose.model("CareerPath", careerPathSchema);
export default CareerPath;
