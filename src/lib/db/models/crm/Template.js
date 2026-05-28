import mongoose from 'mongoose'

const EarningSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  editable: {
    type: Boolean,
    default: true
  },
  isPercentage: {
    type: Boolean,
    default: false
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  calculationType: {
    type: String,
    enum: ['percentage', 'fixed', 'computed'],
    default: 'percentage'
  }
}, { _id: false })

const DeductionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  editable: {
    type: Boolean,
    default: true
  },
  isPercentage: {
    type: Boolean,
    default: false
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  calculationType: {
    type: String,
    enum: ['percentage', 'fixed', 'computed'],
    default: 'percentage'
  }
}, { _id: false })

const AdditionalFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, { _id: false })

const StylingSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#f59e0b'
  },
  secondaryColor: {
    type: String,
    default: '#fffbeb'
  },
  fontFamily: {
    type: String,
    default: 'Inter'
  },
  showWatermark: {
    type: Boolean,
    default: true
  },
  showOrganizationLogo: {
    type: Boolean,
    default: true
  }
}, { _id: false })

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true
  },
  organizationName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  organizationLogo: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  contact: {
    type: String,
    required: [true, 'Contact information is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  salaryType: {
    type: String,
    enum: ['monthly', 'perday'],
    default: 'monthly'
  },
  earnings: [EarningSchema],
  deductions: [DeductionSchema],
  additionalFields: [AdditionalFieldSchema],
  styling: {
    type: StylingSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

// Index for faster queries
TemplateSchema.index({ createdBy: 1, isDefault: 1 })
TemplateSchema.index({ createdBy: 1, isActive: 1 })

// Ensure only one default template per user
TemplateSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        _id: { $ne: this._id },
        createdBy: this.createdBy,
        isDefault: true 
      },
      { $set: { isDefault: false } }
    )
  }
  next()
})
delete mongoose.models.Template
const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema)

export default Template