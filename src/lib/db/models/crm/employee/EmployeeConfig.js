import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const employeeConfigSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    employeeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeType",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    employeeCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeCategory",
      required: true,
    },
     employeeSubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeSubCategory",
      required: true,
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

// Avoid duplicate category in same org
employeeTypeSchema.index(
  { organizationName: 1, employeeCategory: 1 },
  { unique: true }
);

delete mongoose.models.EmployeeConfig;
export default mongoose.models.EmployeeConfig ||
  mongoose.model("EmployeeConfig", employeeConfigSchema);
