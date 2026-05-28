import mongoose from "mongoose";

const DEFAULT_USER_ID = new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33");

const employeeCategorySchema = new mongoose.Schema(
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

    employeeCategory: {
      type: String,
      required: true,
      trim: true,
    },
    supportedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: [],
    }],

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

// Avoid duplicate category in same employee type
employeeCategorySchema.index(
  { organizationId: 1, departmentId: 1, employeeTypeId: 1, employeeCategory: 1 },
  { unique: true }
);

// Compound index for efficient queries
employeeCategorySchema.index({ organizationId: 1, departmentId: 1, employeeTypeId: 1 });

// Prevent duplicate document IDs in the array
employeeCategorySchema.pre('save', function(next) {
  if (this.supportedDocuments && this.supportedDocuments.length > 0) {
    this.supportedDocuments = [...new Set(this.supportedDocuments.map(id => id.toString()))];
  }
  next();
});

delete mongoose.models.EmployeeCategory;
export default mongoose.models.EmployeeCategory ||
  mongoose.model("EmployeeCategory", employeeCategorySchema);