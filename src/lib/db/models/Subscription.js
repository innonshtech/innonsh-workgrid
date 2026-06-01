// src/lib/db/models/Subscription.js
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  razorpayInvoiceId: String,
  amount: Number,
  status: {
    type: String,
    enum: ["paid", "pending", "failed"],
    default: "pending"
  },
  paidAt: Date,
  invoiceUrl: String
});

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true, // One active subscription per org
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The admin who purchased it
      required: true,
    },
    plan: {
      type: String,
      enum: ["trial", "starter", "growth", "enterprise"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "expired", "trialing"],
      default: "trialing",
    },
    razorpayCustomerId: {
      type: String,
    },
    razorpaySubscriptionId: {
      type: String,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    invoices: [invoiceSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
