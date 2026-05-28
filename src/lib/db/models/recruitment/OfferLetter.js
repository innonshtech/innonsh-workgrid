import mongoose from 'mongoose';

const offerLetterSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    jobTitle: {
        type: String,
        required: true
    },
    salary: {
        amount: Number,
        currency: { type: String, default: 'INR' },
        frequency: { type: String, default: 'Yearly' }
    },
    joiningDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending Internal Approval', 'Approved', 'Sent', 'Accepted', 'Declined', 'Expired'],
        default: 'Draft'
    },
    expiryDate: Date,
    terms: [String],
    documentUrl: String, // Link to generated PDF if any
    content: String, // Markdown or HTML content
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    signedAt: Date,
    aiGenerated: {
        type: Boolean,
        default: false
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    approvalChain: [{
        role: { type: String, required: true }, // e.g., 'HR Admin', 'Finance'
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        remarks: String
    }]
}, {
    timestamps: true
});

const OfferLetter = mongoose.models.OfferLetter || mongoose.model('OfferLetter', offerLetterSchema);

export default OfferLetter;
