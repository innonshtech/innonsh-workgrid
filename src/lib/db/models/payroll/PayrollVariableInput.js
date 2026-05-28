
import mongoose from 'mongoose';

const payrollVariableInputSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    componentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VariablePayConfig',
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    targetAmount: { // Snapshot of target at that time
        type: Number,
        required: true
    },
    achievementPercentage: {
        type: Number,
        required: true,
        min: 0
    },
    payoutAmount: {
        type: Number,
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Draft', 'Approved', 'Paid'],
        default: 'Draft'
    }
}, { timestamps: true });

// Index to ensure one input per component per employee per month
payrollVariableInputSchema.index({ employeeId: 1, componentId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.PayrollVariableInput || mongoose.model('PayrollVariableInput', payrollVariableInputSchema);
