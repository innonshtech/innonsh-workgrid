import mongoose from "mongoose";

if (mongoose.models.StaffingRequirement) {
  delete mongoose.models.StaffingRequirement;
}

const staffingRequirementSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffingClient",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Requirement title is required"],
      trim: true,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    minExperience: {
      type: Number,
      default: 0,
    },
    maxExperience: {
      type: Number,
      default: 0,
    },
    budgetRange: {
      type: String,
      default: "",
    },
    durationMonths: {
      type: Number,
      default: 0,
    },
    openingsCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["open", "closed", "on-hold"],
      default: "open",
    },
    description: {
      type: String,
      default: "",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const StaffingRequirement = mongoose.models.StaffingRequirement || mongoose.model("StaffingRequirement", staffingRequirementSchema);

export default StaffingRequirement;
