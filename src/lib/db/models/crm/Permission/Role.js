// src/lib/db/models/crm/Permission/Role.js
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // Optional for system-wide roles
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        type: String, // Store permission slugs directly for fast lookup
      }
    ],
    isSystemRole: {
      type: Boolean,
      default: false, // True for built-in roles like "Super Admin" that cannot be edited/deleted
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Ensure unique slug per organization, but allow global slugs if organizationId is null
roleSchema.index({ slug: 1, organizationId: 1 }, { unique: true });

export default mongoose.models.Role || mongoose.model("Role", roleSchema);
