import mongoose from "mongoose";

const documentRequirementSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true, // e.g., "Aadhar Card", "PAN Card", etc.
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    reminderDays: {
      type: Number,
      default: 7, // days after which to send reminder
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup
documentRequirementSchema.index({ documentType: 1 });
documentRequirementSchema.index({ isActive: 1 });

const DocumentRequirement = mongoose.models.DocumentRequirement ||
  mongoose.model("DocumentRequirement", documentRequirementSchema);

export default DocumentRequirement;