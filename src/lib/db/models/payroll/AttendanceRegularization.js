import mongoose from 'mongoose';

const attendanceRegularizationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Half-Day', 'Absent Correction'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  halfDaySlot: {
    type: String,
    enum: ['First Half', 'Second Half', 'None'],
    default: 'None'
  },
  requestedTime: String,
  remarks: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: Date,
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }
}, {
  timestamps: true
});

// index for quick lookups by status and employee
attendanceRegularizationSchema.index({ employee: 1, date: 1 }, { unique: false });
attendanceRegularizationSchema.index({ approver: 1, status: 1 });

export default mongoose.models.AttendanceRegularization || mongoose.model('AttendanceRegularization', attendanceRegularizationSchema);
