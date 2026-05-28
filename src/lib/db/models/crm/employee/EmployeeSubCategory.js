import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const employeeSubCategorySchema = new mongoose.Schema(
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

    employeeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeType",
      required: true,
    },

    employeeCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeCategory",
      required: true,
    },

    employeeSubCategory: {
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

// Avoid duplicate sub-category in same category
employeeSubCategorySchema.index(
  { 
    organizationId: 1, 
    departmentId: 1, 
    employeeTypeId: 1, 
    employeeCategoryId: 1, 
    employeeSubCategory: 1 
  },
  { unique: true }
);

// Compound index for efficient queries
employeeSubCategorySchema.index({ 
  organizationId: 1, 
  departmentId: 1, 
  employeeTypeId: 1, 
  employeeCategoryId: 1 
});

delete mongoose.models.EmployeeSubCategory;
export default mongoose.models.EmployeeSubCategory ||
  mongoose.model("EmployeeSubCategory", employeeSubCategorySchema);