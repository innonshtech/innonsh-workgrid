import mongoose from "mongoose";

const exitRequestSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        resignationDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        lastWorkingDate: {
            type: Date,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        comments: String,
        status: {
            type: String,
            enum: ["Pending", "Manager_Approved", "HR_Approved", "Rejected", "Completed", "Withdrawn"],
            default: "Pending",
        },
        // Approval Workflow
        managerApproval: {
            status: {
                type: String,
                enum: ["Pending", "Approved", "Rejected"],
                default: "Pending",
            },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            approvalDate: Date,
            comments: String,
        },
        hrApproval: {
            status: {
                type: String,
                enum: ["Pending", "Approved", "Rejected"],
                default: "Pending",
            },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            approvalDate: Date,
            comments: String,
        },
        // Clearance Checklist
        clearanceStatus: {
            it: {
                status: { type: String, enum: ["Pending", "Cleared", "Not Applicable"], default: "Pending" },
                remarks: String,
                clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                clearedDate: Date,
            },
            finance: {
                status: { type: String, enum: ["Pending", "Cleared", "Not Applicable"], default: "Pending" },
                remarks: String,
                clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                clearedDate: Date,
            },
            admin: {
                status: { type: String, enum: ["Pending", "Cleared", "Not Applicable"], default: "Pending" },
                remarks: String,
                clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                clearedDate: Date,
            },
        },
        // Final Settlement
        fnfStatus: {
            status: { type: String, enum: ["Pending", "Processing", "Paid"], default: "Pending" },
            paidDate: Date,
            amount: Number,
            processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            remarks: String,
        },
    },
    {
        timestamps: true,
    }
);

// Delete existing model if it exists
if (mongoose.models.ExitRequest) {
    delete mongoose.models.ExitRequest;
}

export default mongoose.models.ExitRequest || mongoose.model("ExitRequest", exitRequestSchema);
