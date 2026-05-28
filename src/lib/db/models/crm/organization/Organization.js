// src/lib/db/models/organization/Organization.js
import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33"); // same as Employee

const organizationSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      unique: true, // ORG001, ORG002...
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: String,
    address: {
      street: String,
      
    },
     status: {
    type: String,
    enum: ["Active", "Inactive"], // Uses capitalized
    default: "Active",
  },
    website: String,
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    established: {
      type: Date,
    },
    logo: String, // optional: cloudinary url
    linkedinCompanyId: {
        type: String,
        trim: true,
        default: null
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
  {
    timestamps: true,
  }
);

// Indexes (same as Employee)
organizationSchema.index({ status: 1 });
organizationSchema.index({ name: "text", email: "text" });

delete mongoose.models.Organization;
export default mongoose.models.Organization ||
  mongoose.model("Organization", organizationSchema);