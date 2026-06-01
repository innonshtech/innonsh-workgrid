import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // System permissions will have null
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

permissionSchema.index({ module: 1 });
permissionSchema.index({ slug: 1, organizationId: 1 }, { unique: true });
permissionSchema.index({ name: "text", slug: "text", description: "text" });

export default mongoose.models.Permission ||
  mongoose.model("Permission", permissionSchema);
