import mongoose from 'mongoose';
import Employee from './src/lib/db/models/payroll/Employee.js';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function testCalc() {
  await mongoose.connect(MONGODB_URI);
  
  const emp = await Employee.findOne({ employeeId: 'EMP-003' }).populate('jobDetails.departmentId');
  
  if(!emp) {
      console.log('Employee not found');
      process.exit();
  }
  console.log('Payslip structure basic:', emp.payslipStructure?.basicSalary);

  const calc = await emp.calculateSalaryComponents(null, {
      month: 3,
      year: 2026,
      workingDaysInMonth: 31
  });

  console.log('Calculation Result:', JSON.stringify(calc, null, 2));
  
  // also let's look at the generated payroll runs
  const pr = await mongoose.connection.db.collection('payrollruns').find({}).toArray();
  console.log('Payroll Runs:', pr.length);

  const ps = await mongoose.connection.db.collection('payslips').find({ status: 'Draft' }).toArray();
  console.log('Draft Payslips from Batch:', ps.length);
  if(ps.length > 0) {
      console.log('Sample Draft Net:', ps[0].netSalary);
  }

  process.exit();
}
testCalc();
