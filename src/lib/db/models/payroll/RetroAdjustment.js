import mongoose from 'mongoose';

const retroAdjustmentSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    payrollRunId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PayrollRun',
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
    componentName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Earning', 'Deduction'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    adjustmentType: {
        type: String,
        enum: ['Retro', 'Bonus', 'Arrear', 'Correction', 'Other'],
        default: 'Retro'
    },
    status: {
        type: String,
        enum: ['Pending', 'Applied', 'Cancelled'],
        default: 'Pending'
    },
    appliedInMonth: Number,
    appliedInYear: Number,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

retroAdjustmentSchema.index({ employeeId: 1, month: 1, year: 1, componentName: 1 });

export default mongoose.models.RetroAdjustment || mongoose.model('RetroAdjustment', retroAdjustmentSchema);
