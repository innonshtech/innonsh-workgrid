import mongoose from 'mongoose';

const ptSlabSchema = new mongoose.Schema({
    minSalary: {
        type: Number,
        required: true,
    },
    maxSalary: {
        type: Number,
        required: true, // Use Infinity for the last slab
    },
    taxAmount: {
        type: Number,
        required: true,
    },
    // Some states have different tax for specific months (e.g., Feb/March)
    exceptionMonth: {
        type: Number, // 0-11 or 1-12
        default: null,
    },
    exceptionTaxAmount: {
        type: Number,
        default: null,
    },
}, { _id: false });

const lwfRuleSchema = new mongoose.Schema({
    employeeContribution: {
        type: Number,
        required: true
    },
    employerContribution: {
        type: Number,
        required: true
    },
    deductionCycle: {
        type: String,
        enum: ['monthly', 'half-yearly', 'yearly'],
        default: 'monthly'
    },
    deductionMonths: [Number] // e.g., [6, 12] for June and Dec
}, { _id: false });

const statutoryConfigSchema = new mongoose.Schema({
    state: {
        type: String,
        required: true,
        unique: true, // One config per state
        trim: true,
    },
    isEnabled: {
        type: Boolean,
        default: true,
    },
    ptApplicable: {
        type: Boolean,
        default: true,
    },
    ptSlabs: [ptSlabSchema],

    lwfApplicable: {
        type: Boolean,
        default: false
    },
    lwfRules: lwfRuleSchema,

    // Metadata
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
});

// Default pre-population/bootstrap logic could go here or in a seed script

export default mongoose.models.StatutoryConfig || mongoose.model('StatutoryConfig', statutoryConfigSchema);
