import mongoose from 'mongoose';

const onboardingChecklistSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    tasks: [{
        category: {
            type: String,
            enum: ['Documentation', 'IT Setup', 'Training', 'Orientation', 'Finance'],
            default: 'Documentation'
        },
        task: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Skipped'],
            default: 'Pending'
        },
        dueDate: Date,
        completedAt: Date,
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee' // Person responsible (e.g., IT Admin, HR)
        },
        notes: String
    }],
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    }
}, {
    timestamps: true
});

const OnboardingChecklist = mongoose.models.OnboardingChecklist || mongoose.model('OnboardingChecklist', onboardingChecklistSchema);

export default OnboardingChecklist;
