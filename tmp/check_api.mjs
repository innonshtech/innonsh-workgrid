import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function checkSamer() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const employees = db.collection('employees');

  const samer = await employees.findOne({
    $or: [
      { 'personalDetails.firstName': { $regex: /samer/i } },
      { 'personalDetails.firstName': { $regex: /sameer/i } }
    ]
  });

  if (!samer) {
    console.log('Not found');
    process.exit(0);
  }

  console.log(`\nSamer ID: ${samer._id}`);
  console.log('Basic Salary:', samer.payslipStructure?.basicSalary);

  // Let's also test hitting the actual API
  try {
    const res = await fetch(`http://localhost:3000/api/v1/admin/employees/${samer._id}`);
    const data = await res.json();
    console.log('\n--- API RESPONSE ---');
    console.log(`Success: ${data.success}`);
    if (data.employee) {
       console.log(`payslipStructure.basicSalary: ${data.employee.payslipStructure?.basicSalary}`);
       console.log(`jobDetails.organization: ${data.employee.jobDetails?.organization}`);
    } else {
       console.log('Error:', data.error);
    }
  } catch (err) {
    console.error('API Error:', err.message);
  }

  await mongoose.disconnect();
}

checkSamer();
