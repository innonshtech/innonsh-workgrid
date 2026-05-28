import mongoose from "mongoose";

const demoRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companySize: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "credentials_sent", "failed"],
      default: "pending",
    },
    loginEmail: {
      type: String,
    },
    loginPassword: {
      type: String,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.DemoRequest) {
  delete mongoose.models.DemoRequest;
}

export default mongoose.models.DemoRequest || mongoose.model("DemoRequest", demoRequestSchema);
