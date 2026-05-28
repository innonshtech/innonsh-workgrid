import mongoose from "mongoose";

const attendanceThresholdSchema = new mongoose.Schema(
  {
    criteria: [
      {
        organizationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Organization",
          required: true,
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EmployeeCategory",
          required: true,
        },
        subType: {
          type: String,
          default: null,
        },
        departmentId: { // Added for frontend consistency, optional reference
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department"
        }
      }
    ],
    threshold: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Removed specific compound index as it's complex with array. 
// Can rely on application logic or create specific index if needed later.

// HMR - prevent model caching in dev mode causing schema validation errors
if (mongoose.models.AttendanceThreshold) {
  delete mongoose.models.AttendanceThreshold;
}

const AttendanceThreshold = mongoose.model("AttendanceThreshold", attendanceThresholdSchema);

export default AttendanceThreshold;