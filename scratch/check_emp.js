import dbConnect from '../src/lib/db/connect.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkEmployee() {
  await dbConnect();
  const employee = await Employee.findOne({ employeeId: 'EMP003' });
  console.log('Employee EMP003 State:');
  console.log('isTDSApplicable:', employee.isTDSApplicable);
  console.log('taxRegime:', employee.taxRegime);
  console.log('Salary structure deductions:', JSON.stringify(employee.payslipStructure.deductions, null, 2));
  
  // Test calculation
  const statutoryConfig = {
    state: 'Maharashtra',
    isEnabled: true,
    ptApplicable: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 7500, taxAmount: 0 },
      { minSalary: 7501, maxSalary: 10000, taxAmount: 175 },
      { minSalary: 10001, maxSalary: 1000000, taxAmount: 200 }
    ]
  };
  
  const calc = await employee.calculateSalaryComponents(statutoryConfig, { month: 4, year: 2026 });
  console.log('\nCalculated Components for April 2026:');
  console.log('Total Earnings:', calc.totalEarnings);
  console.log('Deductions:', JSON.stringify(calc.deductions, null, 2));
  
  mongoose.disconnect();
}

checkEmployee().catch(console.error);
