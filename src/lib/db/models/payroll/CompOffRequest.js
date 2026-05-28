import mongoose from 'mongoose';

const compOffRequestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    type: {
        type: String,
        enum: ['Earn', 'Use'], // Earn = Worked on holiday, Use = Taking leave using balance
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    days: {
        type: Number,
        enum: [0.5, 1],
        default: 1
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

compOffRequestSchema.index({ employee: 1, status: 1 });

export default mongoose.models.CompOffRequest || mongoose.model('CompOffRequest', compOffRequestSchema);
