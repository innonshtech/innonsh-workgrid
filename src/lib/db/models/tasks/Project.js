import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        name: { type: String, required: true, trim: true },
        client: { type: String, required: true, trim: true },
        description: { type: String },
        projectManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Employee",
            },
        ],
        leads: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Employee",
            },
        ],
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        status: {
            type: String,
            enum: ["Active", "Completed", "On Hold", "Pipeline"],
            default: "Active",
        },
        budget: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        isInternal: { type: Boolean, default: false },
        billingType: {
            type: String,
            enum: ["Fixed", "Time & Material"],
            default: "Fixed",
        },
        isBillable: { type: Boolean, default: true },
        boardColumns: {
            type: [String],
            default: ["Pending", "In Progress", "Completed", "Blocked"]
        },
        prefix: { type: String, uppercase: true, trim: true, default: "PROJ" },
        taskCounter: { type: Number, default: 0 },
    },

    { timestamps: true }
);

// Indexes
projectSchema.index({ name: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ projectManager: 1 });

if (mongoose.models.Project) {
    delete mongoose.models.Project;
}

export default mongoose.model("Project", projectSchema);
