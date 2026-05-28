import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    assetId: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Available", "Assigned", "In Repair", "Damaged", "Lost", "Retired"],
      default: "Available",
    },

    // JIT: The specific employee holding this physical item
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    
    // JIT: Links to the Master Vault
    productCatalogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCatalog",
    },

    purchaseDate: Date,
    value: Number,
    description: String,
    serialNumber: String,
    vendor: String,
    warrantyExpiry: Date,

    history: [
      {
        action: String,
        date: { type: Date, default: Date.now },

        // You can also change this if needed
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        details: String,
      },
    ],

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
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

if (mongoose.models.Asset) {
  delete mongoose.models.Asset;
}

export default mongoose.models.Asset || mongoose.model("Asset", assetSchema);
