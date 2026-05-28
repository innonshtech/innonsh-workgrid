import mongoose from 'mongoose';

const salaryComponentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['Earning', 'Deduction'],
        required: true
    },
    calculationType: {
        type: String,
        enum: ['Percentage', 'Fixed', 'Computed'],
        required: true
    },
    percentageOf: {
        type: String, // e.g., 'Basic', 'Gross'
        default: 'Basic'
    },
    defaultValue: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        enum: ['Standard', 'Statutory', 'Variable', 'Allowance', 'Reimbursement'],
        default: 'Standard'
    },
    isTaxable: {
        type: Boolean,
        default: true
    },
    isStatutory: {
        type: Boolean,
        default: false
    },
    enabled: {
        type: Boolean,
        default: true
    },
    description: String,
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export default mongoose.models.SalaryComponent || mongoose.model('SalaryComponent', salaryComponentSchema);
