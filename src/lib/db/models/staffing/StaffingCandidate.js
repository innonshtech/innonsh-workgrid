import mongoose from "mongoose";

if (mongoose.models.StaffingCandidate) {
  delete mongoose.models.StaffingCandidate;
}

const staffingCandidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Candidate email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["available", "interviewing", "deployed", "blacklisted"],
      default: "available",
    },
    parsedResume: {
      skills: {
        type: [String],
        default: [],
      },
      experience: [
        {
          company: String,
          role: String,
          duration: String,
          years: Number,
          highlights: [String],
        },
      ],
      education: [
        {
          institution: String,
          degree: String,
          year: String,
        },
      ],
      summary: {
        type: String,
        default: "",
      },
      totalExperienceYears: {
        type: Number,
        default: 0,
      },
      currentRole: {
        type: String,
        default: "",
      },
      currentCompany: {
        type: String,
        default: "",
      },
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize search by email per organization & quick search in skills array
staffingCandidateSchema.index({ email: 1, organizationId: 1 }, { unique: true });
staffingCandidateSchema.index({ "parsedResume.skills": 1 });

const StaffingCandidate = mongoose.models.StaffingCandidate || mongoose.model("StaffingCandidate", staffingCandidateSchema);

export default StaffingCandidate;
