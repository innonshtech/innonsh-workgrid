import mongoose from "mongoose";

const productCatalogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 1,
    },
    description: String,
    value: Number,
    
    // SaaS PROTECTION
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.ProductCatalog) {
  delete mongoose.models.ProductCatalog;
}

export default mongoose.models.ProductCatalog || mongoose.model("ProductCatalog", productCatalogSchema);
