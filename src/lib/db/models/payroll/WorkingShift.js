import mongoose from "mongoose";

const workingShiftSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        startTime: {
            type: String, // "09:00"
            required: true,
        },
        endTime: {
            type: String, // "18:00"
            required: true,
        },
        lateCutoffTime: {
            type: String, // e.g., "09:15"
            default: "09:15",
        },
        absentCutoffTime: {
            type: String, // e.g., "11:00"
            default: "11:00",
        },
        halfDayCutoffTime: {
            type: String, // e.g., "12:30"
            default: "12:30",
        },
        halfDayMinHours: {
            type: Number, // Minimum worked hours to count as full day
            default: 4,
        },
        breakDuration: {
            type: Number, // in minutes
            default: 60,
        },
        workingDays: {
            type: [String],
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        color: {
            type: String,
            default: "#4f46e5", // Indigo
        },
        description: String,
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Ensure only one default shift per organization
workingShiftSchema.index({ organizationId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export default mongoose.models.WorkingShift || mongoose.model("WorkingShift", workingShiftSchema);
