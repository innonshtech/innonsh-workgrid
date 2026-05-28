const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

// Define Schemas (Simplified)
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: Date,
  checkOut: Date,
  totalHours: { type: Number, default: 0 },
  status: { type: String, enum: ['Present', 'Absent', 'Half-day', 'Leave', 'Holiday', 'Weekend'], default: 'Present' },
  isProxy: { type: Boolean, default: false },
  dayType: { type: String, enum: ['Full', 'Half'], default: 'Full' },
  workedHours: { type: Number, default: 0 },
  attendanceMethod: { type: String, default: 'Web' }
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const leaveEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  leaveType: { type: String, enum: ["Paid", "Unpaid", "Half-Day Paid", "Half-Day Unpaid"], required: true },
  reason: { type: String, default: "" },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedAt: { type: Date, default: Date.now }
});

const leaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  organizationId: mongoose.Schema.Types.ObjectId,
  organizationType: { type: String, required: true },
  department: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  leaves: [leaveEntrySchema],
  summary: {
    totalDays: { type: Number, default: 0 },
    paidLeaves: { type: Number, default: 0 },
    unpaidLeaves: { type: Number, default: 0 },
    halfDayPaidLeaves: { type: Number, default: 0 },
    halfDayUnpaidLeaves: { type: Number, default: 0 },
  },
  status: { type: String, enum: ["Draft", "Approved", "Rejected"], default: "Approved" }
}, { timestamps: true });

leaveSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const employeeSchema = new mongoose.Schema({
  employeeId: String,
  personalDetails: { firstName: String, lastName: String },
  jobDetails: { department: String, organizationId: mongoose.Schema.Types.ObjectId, organization: String },
  status: String
}, { strict: false });

// Register models
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

async function populateDummyData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbUrl);
    console.log('Connected.');

    const employees = await Employee.find({ status: 'Active' });
    console.log(`Found ${employees.length} active employees.`);

    const startDate = new Date('2026-04-01');
    const endDate = new Date('2026-05-11');
    
    // Clear existing data for the range
    console.log('Clearing existing records for April and May...');
    await Attendance.deleteMany({
      date: { $gte: startDate, $lte: endDate }
    });
    await Leave.deleteMany({
      $or: [
        { month: 4, year: 2026 },
        { month: 5, year: 2026 }
      ]
    });

    for (const emp of employees) {
      console.log(`Processing ${emp.personalDetails.firstName} ${emp.personalDetails.lastName} (${emp.employeeId})...`);
      
      const attendanceRecords = [];
      const monthlyLeaves = {
        4: [], // April
        5: []  // May
      };

      let current = new Date(startDate);
      while (current <= endDate) {
        const day = current.getDay(); // 0: Sun, 6: Sat
        const dateStr = current.toISOString().split('T')[0];
        const month = current.getMonth() + 1;
        const year = current.getFullYear();

        let status = 'Present';
        let leaveType = null;

        if (day === 0 || day === 6) {
          status = 'Weekend';
        } else {
          const rand = Math.random();
          if (rand < 0.05) {
            status = 'Absent';
            leaveType = 'Unpaid';
          } else if (rand < 0.12) {
            status = 'Leave';
            leaveType = 'Paid';
          } else if (rand < 0.18) {
            status = 'Half-day';
            // 50% chance of paid/unpaid half day
            leaveType = Math.random() < 0.5 ? 'Paid' : 'Unpaid';
          } else {
            status = 'Present';
          }
        }

        const randomMinutes = Math.floor(Math.random() * 20) - 10; // -10 to +10 minutes
        const checkInTime = new Date(`${dateStr}T09:00:00`);
        checkInTime.setMinutes(checkInTime.getMinutes() + randomMinutes);
        
        const checkOutTime = new Date(`${dateStr}T18:00:00`);
        checkOutTime.setMinutes(checkOutTime.getMinutes() + Math.floor(Math.random() * 30)); 

        const attendance = {
          employee: emp._id,
          date: new Date(current),
          status: status,
          checkIn: (status === 'Present' || status === 'Half-day') ? checkInTime : null,
          checkOut: status === 'Present' ? checkOutTime : (status === 'Half-day' ? new Date(`${dateStr}T13:00:00`) : null),
          totalHours: status === 'Present' ? 9 : (status === 'Half-day' ? 4 : 0),
          workedHours: status === 'Present' ? 8 + (Math.random() * 0.5) : (status === 'Half-day' ? 4 : 0),
          dayType: status === 'Half-day' ? 'Half' : 'Full',
          attendanceMethod: 'Web'
        };
        attendanceRecords.push(attendance);

        if (leaveType) {
          monthlyLeaves[month].push({
            date: new Date(current),
            leaveType: leaveType,
            reason: `Dummy ${leaveType} Leave`,
            approvedAt: new Date()
          });
        }

        current.setDate(current.getDate() + 1);
      }

      // Insert Attendance
      await Attendance.insertMany(attendanceRecords);

      // Create Leave summaries
      for (const month of [4, 5]) {
        if (monthlyLeaves[month].length > 0) {
          const leaves = monthlyLeaves[month];
          const paidCount = leaves.filter(l => l.leaveType === 'Paid').length;
          const unpaidCount = leaves.filter(l => l.leaveType === 'Unpaid').length;

          const leaveSummary = new Leave({
            employeeId: emp._id,
            employeeCode: emp.employeeId,
            employeeName: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
            organizationId: emp.jobDetails.organizationId,
            organizationType: emp.jobDetails.organization || 'Organization',
            department: emp.jobDetails.department || 'General',
            month: month,
            year: 2026,
            leaves: leaves,
            summary: {
              totalDays: leaves.length,
              paidLeaves: paidCount,
              unpaidLeaves: unpaidCount,
              halfDayPaidLeaves: 0,
              halfDayUnpaidLeaves: 0
            },
            status: 'Approved'
          });
          await leaveSummary.save();
        }
      }
    }

    console.log('✅ Dummy data population complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

populateDummyData();
