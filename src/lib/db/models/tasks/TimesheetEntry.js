import mongoose from "mongoose";

const timesheetEntrySchema = new mongoose.Schema(
    {
        timesheet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Timesheet",
            required: true,
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
        },
        date: {
            type: Date,
            required: true,
        },
        hours: {
            type: Number,
            required: true,
            min: 0,
            max: 24,
        },
        description: {
            type: String,
            trim: true,
        },
        isBillable: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes for fast querying
timesheetEntrySchema.index({ timesheet: 1 });
timesheetEntrySchema.index({ employee: 1, date: 1 });
timesheetEntrySchema.index({ project: 1 });

if (mongoose.models.TimesheetEntry) {
    delete mongoose.models.TimesheetEntry;
}

export default mongoose.model("TimesheetEntry", timesheetEntrySchema);
