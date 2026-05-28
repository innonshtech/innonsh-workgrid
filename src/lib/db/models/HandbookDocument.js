import mongoose from "mongoose";

const handbookDocumentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            default: "General",
        },
        fileUrl: {
            type: String, // URL to file or base64 string if small
            required: true,
        },
        fileType: {
            type: String, // e.g., 'application/pdf'
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default mongoose.models.HandbookDocument ||
    mongoose.model("HandbookDocument", handbookDocumentSchema);
