//src/lib/db/models/Department/department.js
import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const departmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    businessUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessUnit",
      required: false, // Optional for now to support legacy data
    },
    departmentName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    permissions: {
      type: [String],
      default: [],
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

departmentSchema.index(
  { organizationId: 1, departmentName: 1 },
  { unique: true }
);
// Index for search
departmentSchema.index({ departmentName: "text" });

export default mongoose.models.Department ||
  mongoose.model("Department", departmentSchema);
