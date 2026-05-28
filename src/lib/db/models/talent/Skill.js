import mongoose from "mongoose";

const skillSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Technical', 'Soft Skill', 'Leadership', 'Language', 'Tool'],
        required: true
    },
    proficiency: {
        type: Number, // 1-5 (Beginner to Expert)
        required: true,
        min: 1,
        max: 5
    },
    lastAssessed: {
        type: Date,
        default: Date.now
    },
    certifications: [{
        title: String,
        issuingOrg: String,
        issueDate: Date,
        expiryDate: Date,
        credentialUrl: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Skill = mongoose.models.Skill || mongoose.model("Skill", skillSchema);
export default Skill;
