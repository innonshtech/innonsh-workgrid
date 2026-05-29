import mongoose from "mongoose";

if (mongoose.models.StaffingSubmission) {
  delete mongoose.models.StaffingSubmission;
}

const staffingSubmissionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffingCandidate",
      required: true,
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffingRequirement",
      required: true,
    },
    stage: {
      type: String,
      enum: [
        "submitted",         // Submitted to client
        "l1-round",          // L1 Tech Round
        "l2-round",          // L2 Tech Round
        "client-interview",  // Client Interview Round
        "offered",           // Offered
        "deployed",          // Deployed / Joined
        "rejected",          // Rejected by client
        "withdrawn",         // Candidate backed out
      ],
      default: "submitted",
    },
    fitScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    fitAnalysis: {
      type: String,
      default: "",
    },
    fitStrengths: {
      type: [String],
      default: [],
    },
    fitGaps: {
      type: [String],
      default: [],
    },
    fitRecommendation: {
      type: String,
      default: "",
    },
    statusHistory: [
      {
        stage: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    notes: {
      type: String,
      default: "",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique submissions of a candidate to a specific requirement
staffingSubmissionSchema.index({ candidateId: 1, requirementId: 1 }, { unique: true });

const StaffingSubmission = mongoose.models.StaffingSubmission || mongoose.model("StaffingSubmission", staffingSubmissionSchema);

export default StaffingSubmission;
