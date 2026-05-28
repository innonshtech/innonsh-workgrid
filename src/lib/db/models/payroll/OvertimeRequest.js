import mongoose from 'mongoose';

const overtimeRequestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    hours: {
        type: Number,
        required: true,
        min: 0.5
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    adminNotes: String
}, {
    timestamps: true
});

overtimeRequestSchema.index({ employee: 1, date: 1 });
overtimeRequestSchema.index({ status: 1 });

export default mongoose.models.OvertimeRequest || mongoose.model('OvertimeRequest', overtimeRequestSchema);
