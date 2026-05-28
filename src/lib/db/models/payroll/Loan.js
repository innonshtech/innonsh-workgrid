import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'onModel'
        },
        onModel: {
            type: String,
            required: true,
            enum: ['User', 'Employee'],
            default: 'Employee'
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        type: {
            type: String,
            enum: ["Loan", "Advance"],
            default: "Advance",
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Repaid", "Cancelled"],
            default: "Pending",
        },
        repaymentSchedule: [
            {
                dueDate: Date,
                amount: Number,
                status: {
                    type: String,
                    enum: ["Pending", "Paid"],
                    default: "Pending",
                },
                paymentDate: Date,
            },
        ],
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        requestDate: {
            type: Date,
            default: Date.now,
        },
        approvalDate: Date,
        rejectionReason: String,
        installments: {
            type: Number,
            default: 1, // Number of months/installments
        },
        interestRate: { // Optional, for loans
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate compilation
export default mongoose.models.Loan || mongoose.model("Loan", loanSchema);
