import mongoose from 'mongoose';
import Payslip from './src/lib/db/models/payroll/Payslip.js';
import Employee from './src/lib/db/models/payroll/Employee.js';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function testInsert() {
  await mongoose.connect(MONGODB_URI);

  const emp = await Employee.findOne({ employeeId: 'EMP-003' });
  const payslipMock = {
          payslipId: 'PSL-DEBUG-01',
          payrollRunId: new mongoose.Types.ObjectId(),
          employee: emp._id,
          employeeType: null,
          organizationId: emp.jobDetails.organizationId,
          organizationName: 'Innonsh Technologies',
          month: 3,
          year: 2026,
          status: 'Draft',
          salaryType: 'monthly',
          basicSalary: 25000,
          grossSalary: 26000,
          totalDeductions: 1000,
          netSalary: 25000,
          workingDays: 31,
          presentDays: 31,
          generatedBy: new mongoose.Types.ObjectId(),
          earnings: [],
          deductions: []
  };

  try {
      await Payslip.create(payslipMock);
      console.log('Insert successful!');
  } catch (err) {
      console.error('Validation Error Details:', JSON.stringify(err.errors, null, 2));
      console.error('Message:', err.message);
  }

  process.exit();
}
testInsert();
