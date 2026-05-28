import mongoose from "mongoose";

const helpdeskTicketSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ["IT", "Payroll", "HR", "Leave", "General", "Other"],
            default: "General",
            required: true,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Open", "In Process", "Resolved", "Closed"],
            default: "Open",
        },
        description: {
            type: String,
            required: true,
        },
        comments: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                userName: String, // Store name for easier display
                message: String,
                date: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // specific HR or Admin
        },
    },
    { timestamps: true }
);

// Prevent overwrite on hot reload
export default mongoose.models.HelpdeskTicket ||
    mongoose.model("HelpdeskTicket", helpdeskTicketSchema);
