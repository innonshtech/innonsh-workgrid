import mongoose from "mongoose";

const investmentDeclarationSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        financialYear: {
            type: String, // e.g., "2025-26"
            required: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Pending", "Approved", "Rejected"],
            default: "Draft",
        },
        sections: {
            section80C: {
                ppf: { type: Number, default: 0 },
                elss: { type: Number, default: 0 },
                lic: { type: Number, default: 0 },
                nsc: { type: Number, default: 0 },
                others: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
            section80D: {
                mediclaimSelf: { type: Number, default: 0 },
                mediclaimParents: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
            hra: {
                annualRent: { type: Number, default: 0 },
                landlordPan: { type: String },
                city: { type: String, enum: ["Metro", "Non-Metro"], default: "Non-Metro" },
            },
            otherDeductions: {
                standardDeduction: { type: Number, default: 50000 },
                professionalTax: { type: Number, default: 0 },
                others: { type: Number, default: 0 },
            }
        },
        actualSubmissions: [
            {
                fileName: String,
                fileUrl: String,
                category: String,
                amount: Number,
                submittedDate: { type: Date, default: Date.now },
                status: { type: String, enum: ["Verified", "Rejected", "Pending"], default: "Pending" },
                remarks: String
            }
        ],
        remarks: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedDate: Date,
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one declaration per employee per financial year
investmentDeclarationSchema.index({ employeeId: 1, financialYear: 1 }, { unique: true });

export default mongoose.models.InvestmentDeclaration || mongoose.model("InvestmentDeclaration", investmentDeclarationSchema);
