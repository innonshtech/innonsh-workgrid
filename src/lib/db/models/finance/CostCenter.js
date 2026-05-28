import mongoose from "mongoose";

const DEFAULT_USER_ID = "674e92d8ce08af0109923297";

const costCenterSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: String,
        budget: {
            type: Number,
            default: 0,
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
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

export default mongoose.models.CostCenter ||
    mongoose.model("CostCenter", costCenterSchema);
