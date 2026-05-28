import mongoose from 'mongoose';
import '../../src/lib/db/models/payroll/Employee.js';
import '../../src/lib/db/models/payroll/LeaveApplication.js';
import '../../src/lib/db/models/payroll/Leave.js';

async function checkLokeek() {
    try {
        await mongoose.connect('mongodb://localhost:27017/bizmate');
        const Employee = mongoose.model('Employee');
        const LeaveApplication = mongoose.model('LeaveApplication');
        const Leave = mongoose.model('Leave');

        const emp = await Employee.findOne({ 'personalDetails.firstName': 'Lokeek' });
        if (!emp) {
            console.log('Lokeek not found');
            return;
        }
        console.log('Employee ID:', emp._id);

        const apps = await LeaveApplication.find({ employee: emp._id });
        console.log('Applications Status Counts:');
        apps.forEach(a => console.log(`- ${a.startDate.toDateString()} to ${a.endDate.toDateString()}: ${a.status} (${a.leaveType})`));

        const leaves = await Leave.find({ employeeId: emp._id }).sort({ year: 1, month: 1 });
        console.log('\nLeave Records (Payroll):');
        leaves.forEach(l => {
            console.log(`- ${l.year}-${l.month}: ${l.summary.paidLeaves} Paid, ${l.summary.unpaidLeaves} Unpaid, Status: ${l.status}`);
            console.log(`  Balance Used: ${l.annualLeaveBalance?.used}, Total Deducted: ${l.annualLeaveBalance?.totalDeducted}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkLokeek();
