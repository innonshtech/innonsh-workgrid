// models/Document.js
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Document name is required"],
    trim: true,
    unique: true,
    minlength: [2, "Document name must be at least 2 characters"],
    maxlength: [100, "Document name cannot exceed 100 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
    default: "",
  },
  documentCategory: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

delete mongoose.models.Document
export default mongoose.models.Document || mongoose.model("Document", documentSchema);