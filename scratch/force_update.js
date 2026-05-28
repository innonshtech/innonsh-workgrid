import dbConnect from '../src/lib/db/connect.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function forceUpdate() {
  await dbConnect();
  const employee = await Employee.findOne({ employeeId: 'EMP003' });
  
  console.log('--- BEFORE UPDATE ---');
  console.log('isTDSApplicable:', employee.isTDSApplicable);
  console.log('Computed Salary Deductions:', JSON.stringify(employee.computedSalary?.deductions, null, 2));

  // Update
  employee.isTDSApplicable = true;
  // Trigger modification flags if necessary, though isTDSApplicable is now in the hook
  await employee.save();

  const updated = await Employee.findOne({ employeeId: 'EMP003' });
  console.log('\n--- AFTER UPDATE ---');
  console.log('isTDSApplicable:', updated.isTDSApplicable);
  console.log('Computed Salary Deductions:', JSON.stringify(updated.computedSalary?.deductions, null, 2));
  
  mongoose.disconnect();
}

forceUpdate().catch(console.error);
