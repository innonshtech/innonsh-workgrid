import mongoose from "mongoose";

const shiftRosterSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        date: {
            type: Date, // The specific day this shift applies to
            required: true,
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkingShift",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        status: {
            type: String,
            enum: ["Published", "Draft"],
            default: "Published",
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

// Index for efficient lookups by employee and date
shiftRosterSchema.index({ employeeId: 1, date: 1 }, { unique: true });
shiftRosterSchema.index({ organizationId: 1, date: 1 });

export default mongoose.models.ShiftRoster || mongoose.model("ShiftRoster", shiftRosterSchema);
