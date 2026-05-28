import mongoose from "mongoose";

const performanceGoalSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    category: {
        type: String,
        enum: ['Development', 'Performance', 'Growth', 'Technical', 'Soft Skills'],
        default: 'Performance'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
        default: 'Not Started'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    keyResults: [{
        description: String,
        status: {
            type: String,
            enum: ['Pending', 'Achieved'],
            default: 'Pending'
        }
    }],
    feedback: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const PerformanceGoal = mongoose.models.PerformanceGoal || mongoose.model("PerformanceGoal", performanceGoalSchema);
export default PerformanceGoal;
