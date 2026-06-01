import mongoose from "mongoose";

const timesheetSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        weekStartDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Approved", "Rejected"],
            default: "Draft",
        },
        totalHours: {
            type: Number,
            default: 0,
        },
        submittedAt: { type: Date },
        submittedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        approvedAt: { type: Date },
        adminNotes: { type: String },
        rejectionReason: { type: String, default: "" },
    },
    { timestamps: true }
);

// Unique index to prevent multiple timesheets for same employee/week
timesheetSchema.index({ employee: 1, weekStartDate: 1 }, { unique: true });
timesheetSchema.index({ status: 1 });

if (mongoose.models.Timesheet) {
    delete mongoose.models.Timesheet;
}

export default mongoose.model("Timesheet", timesheetSchema);
