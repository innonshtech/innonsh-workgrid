import mongoose from 'mongoose';

const customTemplateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['offer_letter', 'relieving_letter', 'email_onboarding', 'email_payslip', 'email_general'],
      required: true,
    },
    subject: {
      type: String, // Used for emails
      default: '',
    },
    content: {
      type: String,
      required: true, // HTML string with variables like {{variable_name}}
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Ensure only one default custom template exists per type per organization
customTemplateSchema.index({ organizationId: 1, type: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

const CustomTemplate = mongoose.models.CustomTemplate || mongoose.model('CustomTemplate', customTemplateSchema);
export default CustomTemplate;
