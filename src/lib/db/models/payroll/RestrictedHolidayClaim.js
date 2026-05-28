import mongoose from "mongoose";

const restrictedHolidayClaimSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    holidayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Holiday",
      required: true,
    },
    holidayListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HolidayList",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved", // Auto-approved by default for simplicity
    },
  },
  { timestamps: true }
);

// Ensure an employee can't claim the same holiday twice
restrictedHolidayClaimSchema.index({ employeeId: 1, holidayId: 1 }, { unique: true });

export default mongoose.models.RestrictedHolidayClaim ||
  mongoose.model("RestrictedHolidayClaim", restrictedHolidayClaimSchema);
