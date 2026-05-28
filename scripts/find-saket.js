const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected!');

  const db = mongoose.connection.db;

  console.log('\nSearching for name/email containing "saket" or "patil"...');
  
  const employees = await db.collection('employees').find({
    $or: [
      { 'personalDetails.firstName': /saket/i },
      { 'personalDetails.lastName': /saket/i },
      { 'personalDetails.firstName': /patil/i },
      { 'personalDetails.lastName': /patil/i },
      { 'personalDetails.email': /saket/i },
      { 'personalDetails.email': /patil/i }
    ]
  }).toArray();

  console.log(`Found ${employees.length} employees:`);
  console.log(JSON.stringify(employees, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
