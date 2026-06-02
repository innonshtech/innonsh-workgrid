import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: String,
    address: String,
    gstin: {
        type: String, // GST Identification Number
        trim: true
    },
    pan: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['IT Services', 'Office Supplies', 'Benefits Provider', 'Consultant', 'Travel', 'Software', 'Maintenance', 'Marketing', 'Legal', 'Other'],
        default: 'Other'
    },
    bankDetails: {
        accountName: String,
        accountNumber: String,
        ifsc: String,
        bankName: String
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

export const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

const vendorInvoiceSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },
    dueDate: Date,
    title: String,
    items: [{
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number,
        taxPercent: { type: Number, default: 18 }, // Default GST in India
        taxAmount: Number
    }],
    category: {
        type: String,
        enum: ['IT Services', 'Office Supplies', 'Benefits Provider', 'Consultant', 'Travel', 'Software', 'Maintenance', 'Marketing', 'Legal', 'Other'],
        default: 'Other'
    },
    description: String,
    subTotal: Number,
    totalTax: Number,
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Paid', 'Cancelled'],
        default: 'Pending'
    },
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    paymentDetails: {
        referenceNumber: String,
        paymentDate: Date,
        paymentMode: String,
        receiptUrl: String
    }
}, {
    timestamps: true
});

export const VendorInvoice = mongoose.models.VendorInvoice || mongoose.model('VendorInvoice', vendorInvoiceSchema);
