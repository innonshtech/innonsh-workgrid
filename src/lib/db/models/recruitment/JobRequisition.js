import mongoose from 'mongoose';

const jobRequisitionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required']
    },
    location: {
        type: String,
        required: [true, 'Location is required']
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        default: 'Full-time'
    },
    headcount: {
        type: Number,
        default: 1,
        min: 1
    },
    workplaceType: {
        type: String,
        enum: ['On-site', 'Remote', 'Hybrid'],
        default: 'On-site'
    },
    experienceLevel: {
        type: String,
        enum: ['Entry', 'Mid', 'Senior', 'Executive', 'Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
        default: null
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending Approval', 'Open', 'Closed', 'On Hold', 'Rejected'],
        default: 'Pending Approval'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    description: {
        type: String,
        required: [true, 'Job description is required']
    },
    requirements: [String],
    skillsRequired: [String],
    aiGenerated: {
        type: Boolean,
        default: false
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'INR' }
    },
    hiringManagerName: {
        type: String,
        trim: true
    },
    hiringManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetDate: Date,
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    approvalChain: [{
        role: { type: String, required: true }, // e.g., 'HR Admin', 'Department Head'
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        remarks: String
    }]
}, {
    timestamps: true
});

const JobRequisition = mongoose.models.JobRequisition || mongoose.model('JobRequisition', jobRequisitionSchema);

export default JobRequisition;
