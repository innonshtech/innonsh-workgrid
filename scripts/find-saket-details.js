const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected!');

  const db = mongoose.connection.db;

  const employee = await db.collection('employees').findOne({ 'personalDetails.email': 'saket.patil@innonsh.com' });
  console.log('\n--- SAKET PATIL DETAILS ---');
  console.log(JSON.stringify(employee, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
