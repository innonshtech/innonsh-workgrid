import mongoose from 'mongoose';

const leaveApplicationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Bereavement', 'Compensatory', 'Unpaid', 'Other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalChain: [{
    level: { type: String, enum: ['Team Lead', 'Manager', 'Admin', 'Selected Approver'] },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    updatedAt: { type: Date, default: Date.now },
    remarks: String
  }],
  finalApproverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  rejectionReason: String,
  contactNumber: String,
  addressDuringLeave: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAdvanceLeave: {
    type: Boolean,
    default: false
  },
  advanceLeaveDeductionPlan: {
    deductionStartMonth: Date,
    numberOfMonths: Number,
    monthlyDeductionAmount: Number
  }
}, {
  timestamps: true
});

leaveApplicationSchema.index({ employee: 1, startDate: 1 });
leaveApplicationSchema.index({ status: 1 });

export default mongoose.models.LeaveApplication || mongoose.model('LeaveApplication', leaveApplicationSchema);