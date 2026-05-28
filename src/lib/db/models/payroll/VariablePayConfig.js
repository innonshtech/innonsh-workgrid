
import mongoose from 'mongoose';

const variablePayConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    frequency: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually'],
        default: 'Monthly',
        required: true
    },
    description: String,
    isActive: {
        type: Boolean,
        default: true
    },
    taxability: {
        type: Boolean,
        default: true // Usually variable pay is taxable
    }
}, { timestamps: true });

export default mongoose.models.VariablePayConfig || mongoose.model('VariablePayConfig', variablePayConfigSchema);
