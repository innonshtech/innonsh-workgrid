import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },
    title: {
        type: String,
        required: [true, 'Expense title is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Travel', 'Food', 'Accommodation', 'Equipment', 'Software', 'Utilities', 'Other'],
        required: true
    },
    amount: {
        type: Number,
        min: 0,
        default: 0
    },
    maxAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: String,
    receiptUrl: String,
    claimType: {
        type: String,
        enum: ['Personal', 'Team', 'Department'],
        default: 'Personal'
    },
    teamMembers: String,
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Paid'],
        default: 'Pending'
    },
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    adminComments: String,
    paymentDetails: {
        referenceNumber: String,
        paymentDate: Date,
        paymentMode: { type: String, enum: ['Bank Transfer', 'Cash', 'UPI'] }
    },
    gstDetails: {
        gstNumber: String,
        gstAmount: Number,
        isGstIncluded: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
