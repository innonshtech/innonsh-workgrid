import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const bankSchema = new mongoose.Schema(
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
        description: String,
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            default: DEFAULT_USER_ID,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: DEFAULT_USER_ID,
        },
    },
    { timestamps: true }
);

bankSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export default mongoose.models.Bank ||
    mongoose.model("Bank", bankSchema);
