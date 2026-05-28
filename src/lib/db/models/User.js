import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Force fresh model on hot reload
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager", "employee", "attendance_only"],
      default: "admin",
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "active",
    },
    // SaaS: which organization this admin manages
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    companyName: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      default: "",
    },
    companySize: {
      type: String,
      default: "",
    },
    // Subscription plan
    plan: {
      type: String,
      enum: ["trial", "starter", "growth", "enterprise"],
      default: "trial",
    },
    planExpiresAt: {
      type: Date,
      default: () => {
        const days = parseInt(process.env.DEMO_TRIAL_DURATION_DAYS || "14", 10);
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    department: String,
    position: String,
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sessionToken: {
      type: String,
    },
    forgotPasswordToken: {
      type: String,
      default: null,
    },
    forgotPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export default mongoose.model("User", userSchema);
