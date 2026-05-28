import mongoose from "mongoose";

const documentReminderSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    missingDocuments: [{
      documentType: {
        type: String,
        required: true,
      },
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderDate: {
        type: Date,
        default: Date.now,
      },
      nextReminderDate: {
        type: Date,
        required: true,
      },
    }],
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentReminderSchema.index({ employeeId: 1 });
documentReminderSchema.index({ "missingDocuments.nextReminderDate": 1 });
documentReminderSchema.index({ status: 1 });

const DocumentReminder = mongoose.models.DocumentReminder ||
  mongoose.model("DocumentReminder", documentReminderSchema);

export default DocumentReminder;