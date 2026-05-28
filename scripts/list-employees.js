const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected!');

  const db = mongoose.connection.db;

  console.log('\n--- ALL EMPLOYEES ---');
  const employees = await db.collection('employees').find({}, {
    projection: {
      employeeId: 1,
      'personalDetails.firstName': 1,
      'personalDetails.lastName': 1,
      'personalDetails.email': 1,
      'email': 1
    }
  }).toArray();

  employees.forEach(emp => {
    console.log(`ID: ${emp.employeeId} | Name: ${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName} | Email: ${emp.personalDetails?.email || emp.email}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
