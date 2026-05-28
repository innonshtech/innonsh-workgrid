import 'dotenv/config';
import mongoose from 'mongoose';
import AttendanceRegularization from './src/lib/db/models/payroll/AttendanceRegularization.js';
import Employee from './src/lib/db/models/payroll/Employee.js';

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const regs = await AttendanceRegularization.find({}).populate('approver');
    console.log("Total Requests in DB: ", regs.length);
    for (let r of regs) {
        console.log(`- Type: ${r.type} | Employee: ${r.employee} | Approver: ${r.approver?._id} (${r.approver?.personalDetails?.firstName}) | Status: ${r.status}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
