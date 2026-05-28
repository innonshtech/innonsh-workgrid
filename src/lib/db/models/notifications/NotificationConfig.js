import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['threshold-exceeded', 'attendance-report', 'document-reminder', 'system', 'bonus', 'salary-payout']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  audienceType: {
    type: String,
    enum: ['individual', 'team', 'organization'],
    default: 'individual'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailRecipient: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ organization: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);