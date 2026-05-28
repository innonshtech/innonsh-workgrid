const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected!');

  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    $or: [
      { email: /saket/i },
      { email: /patil/i },
      { name: /saket/i },
      { name: /patil/i }
    ]
  }).toArray();

  console.log('\n--- USERS FOUND ---');
  console.log(users);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
