import mongoose from "mongoose";

const DEFAULT_USER_ID = "674e92d8ce08af0109923297";

const employmentHistorySchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        action: {
            type: String,
            enum: ["Hire", "Transfer", "Promotion", "Exit", "Rehire", "Correction"],
            required: true,
        },
        effectiveDate: {
            type: Date,
            required: true,
        },
        // Snapshot of key details BEFORE the change
        previousDetails: {
            designation: String,
            departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
            businessUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessUnit" },
            reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            salary: Number,
        },
        // Snapshot of key details AFTER the change
        newDetails: {
            designation: String,
            departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
            businessUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessUnit" },
            reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            salary: Number,
        },
        reason: String,
        comments: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: DEFAULT_USER_ID,
        },
    },
    { timestamps: true }
);

employmentHistorySchema.index({ employeeId: 1, effectiveDate: -1 });

export default mongoose.models.EmploymentHistory ||
    mongoose.model("EmploymentHistory", employmentHistorySchema);
