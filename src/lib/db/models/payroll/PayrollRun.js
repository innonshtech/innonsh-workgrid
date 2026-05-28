import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema({
    runId: {
        type: String,
        unique: true,
        required: true
    },
    month: {
        type: Number, // 1-12
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Processing', 'Completed', 'Approved', 'Locked', 'Published', 'Paid', 'Cancelled'],
        default: 'Draft'
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    needsRecalculation: {
        type: Boolean,
        default: false
    },
    recalculationReason: {
        type: String,
        default: null
    },

    businessUnitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BusinessUnit'
    },
    totalEmployees: {
        type: Number,
        default: 0
    },
    processedEmployees: {
        type: Number,
        default: 0
    },
    failedEmployeesCount: {
        type: Number,
        default: 0
    },
    totalGrossSalary: {
        type: Number,
        default: 0
    },
    totalDeductions: {
        type: Number,
        default: 0
    },
    totalNetSalary: {
        type: Number,
        default: 0
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lockedAt: Date,
    logs: [{
        timestamp: { type: Date, default: Date.now },
        level: { type: String, enum: ['info', 'warning', 'error'] },
        message: String,
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    }],
    periodStart: Date,
    periodEnd: Date,

    // Payout Fields
    payoutStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Partial', 'Completed'],
        default: 'Pending'
    },
    payoutDate: Date,
    bankAdviceFile: {
        url: String,
        generatedAt: Date
    }
}, {
    timestamps: true
});

payrollRunSchema.index({ month: 1, year: 1, organizationId: 1, businessUnitId: 1 }, { unique: true });

export default mongoose.models.PayrollRun || mongoose.model('PayrollRun', payrollRunSchema);
