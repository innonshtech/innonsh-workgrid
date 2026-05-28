import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    referenceNumber: {
        type: String,
        unique: true,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    source: {
        type: String,
        enum: ['Payroll', 'Expense', 'Vendor Invoice', 'Manual'],
        required: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // Link to record like PayrollRun or Expense
    },
    status: {
        type: String,
        enum: ['Draft', 'Posted', 'Cancelled'],
        default: 'Posted'
    },
    lines: [{
        accountName: { type: String, required: true },
        accountType: { type: String, enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], required: true },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
        costCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
        description: String
    }],
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// Middleware to ensure debits and credits balance
journalEntrySchema.pre('save', function (next) {
    const totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return next(new Error('Journal entry must be balanced (Total Debit must equal Total Credit)'));
    }

    this.totalDebit = totalDebit;
    this.totalCredit = totalCredit;
    next();
});

export default mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema);
