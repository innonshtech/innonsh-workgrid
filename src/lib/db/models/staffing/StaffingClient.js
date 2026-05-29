import mongoose from "mongoose";

if (mongoose.models.StaffingClient) {
  delete mongoose.models.StaffingClient;
}

const staffingClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    contactPerson: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: {
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

// Enforce unique client names per organization
staffingClientSchema.index({ name: 1, organizationId: 1 }, { unique: true });

const StaffingClient = mongoose.models.StaffingClient || mongoose.model("StaffingClient", staffingClientSchema);

export default StaffingClient;
