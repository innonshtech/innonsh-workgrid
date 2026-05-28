// Script to fix Samer Gaikwad's employee record:
// 1. Set organization in jobDetails
// 2. Set proper payslip structure with salary

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function fixSamer() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. First find Samer Gaikwad
  const employees = db.collection('employees');
  
  // Search by name (case-insensitive)
  const samer = await employees.findOne({
    $or: [
      { 'personalDetails.firstName': { $regex: /samer/i } },
      { 'personalDetails.firstName': { $regex: /sameer/i } }
    ]
  });

  if (!samer) {
    console.log('Samer Gaikwad not found!');
    
    // List all employees for debugging
    const allEmps = await employees.find({}, { projection: { employeeId: 1, 'personalDetails.firstName': 1, 'personalDetails.lastName': 1, 'jobDetails.organization': 1, 'payslipStructure.basicSalary': 1 } }).toArray();
    console.log('\nAll employees:');
    allEmps.forEach(e => {
      console.log(`  ${e.employeeId}: ${e.personalDetails?.firstName} ${e.personalDetails?.lastName} | Org: ${e.jobDetails?.organization || 'MISSING'} | Basic: ${e.payslipStructure?.basicSalary || 0}`);
    });
    
    await mongoose.disconnect();
    return;
  }

  console.log(`\nFound: ${samer.employeeId} - ${samer.personalDetails?.firstName} ${samer.personalDetails?.lastName}`);
  console.log(`Current Organization: ${samer.jobDetails?.organization || 'MISSING'}`);
  console.log(`Current OrganizationId: ${samer.jobDetails?.organizationId || 'MISSING'}`);
  console.log(`Current Basic Salary: ${samer.payslipStructure?.basicSalary || 0}`);
  console.log(`Current Gross Salary: ${samer.payslipStructure?.grossSalary || 0}`);

  // 2. Find the organization used by Aniket Patil (who works)
  const aniket = await employees.findOne({ 'personalDetails.firstName': { $regex: /aniket/i } });
  if (aniket) {
    console.log(`\nReference employee (Aniket): Org=${aniket.jobDetails?.organization}, OrgId=${aniket.jobDetails?.organizationId}`);
    console.log(`  Basic: ${aniket.payslipStructure?.basicSalary}, Gross: ${aniket.payslipStructure?.grossSalary}`);
    console.log(`  Earnings: ${JSON.stringify(aniket.payslipStructure?.earnings?.map(e => ({name: e.name, pct: e.percentage, fixed: e.fixedAmount, calc: e.calculationType})))}`);
    console.log(`  Deductions: ${JSON.stringify(aniket.payslipStructure?.deductions?.map(d => ({name: d.name, pct: d.percentage, fixed: d.fixedAmount, calc: d.calculationType})))}`);
  }

  // 3. Now update Samer's record
  const orgName = aniket?.jobDetails?.organization || 'Innonsh Technologies';
  const orgId = aniket?.jobDetails?.organizationId;

  // Set a reasonable salary structure for Samer
  const updateObj = {
    'jobDetails.organization': orgName,
  };

  if (orgId) {
    updateObj['jobDetails.organizationId'] = orgId;
  }

  // Only set salary if missing
  if (!samer.payslipStructure?.basicSalary || samer.payslipStructure.basicSalary === 0) {
    // Set a reasonable salary structure 
    updateObj['payslipStructure.basicSalary'] = 25000;
    updateObj['payslipStructure.grossSalary'] = 45000;
    updateObj['payslipStructure.salaryType'] = 'monthly';
    updateObj['payslipStructure.earnings'] = [
      { name: 'HRA', enabled: true, editable: true, calculationType: 'percentage', percentage: 40, fixedAmount: 0 },
      { name: 'Conveyance Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 1600 },
      { name: 'Medical Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 1250 },
      { name: 'Special Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 7150 },
    ];
    updateObj['payslipStructure.deductions'] = [
      { name: 'Employee Provident Fund', enabled: true, editable: false, calculationType: 'percentage', percentage: 12, fixedAmount: 0 },
      { name: 'Professional Tax', enabled: true, editable: false, calculationType: 'fixed', percentage: 0, fixedAmount: 200 },
    ];
  }

  const result = await employees.updateOne(
    { _id: samer._id },
    { $set: updateObj }
  );

  console.log(`\nUpdate result: ${JSON.stringify(result)}`);

  // Verify
  const updated = await employees.findOne({ _id: samer._id });
  console.log(`\nAfter update:`);
  console.log(`  Organization: ${updated.jobDetails?.organization}`);
  console.log(`  OrganizationId: ${updated.jobDetails?.organizationId}`);
  console.log(`  Basic Salary: ${updated.payslipStructure?.basicSalary}`);
  console.log(`  Gross Salary: ${updated.payslipStructure?.grossSalary}`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixSamer().catch(err => {
  console.error(err);
  process.exit(1);
});
