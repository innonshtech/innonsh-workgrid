import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const employeeTypeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    employeeType: {
      type: String,
      required: true,
      trim: true,
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

// Avoid duplicate employee type in same department
employeeTypeSchema.index(
  { organizationId: 1, departmentId: 1, employeeType: 1 },
  { unique: true }
);

// Compound index for efficient queries
employeeTypeSchema.index({ organizationId: 1, departmentId: 1 });

delete mongoose.models.EmployeeType;
export default mongoose.models.EmployeeType ||
  mongoose.model("EmployeeType", employeeTypeSchema);