import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ["Performance", "Festival", "Referral", "Joining", "Other"],
            default: "Performance",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        issuanceType: {
            type: String,
            enum: ["Fixed", "Percentage"],
            default: "Fixed",
        },
        percentageBasis: {
            type: String,
            enum: ["Basic", "Gross"],
            required: function () {
                return this.issuanceType === "Percentage";
            },
        },
        targetAudience: {
            type: String,
            enum: ["Individual", "All", "Department"],
            default: "Individual",
        },
        employees: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Employee",
            },
        ],
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
        },
        paymentDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Paid", "Cancelled"],
            default: "Pending",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        organizationId: {
            type: String,
            required: true,
            index: true
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Bonus || mongoose.model("Bonus", bonusSchema);
