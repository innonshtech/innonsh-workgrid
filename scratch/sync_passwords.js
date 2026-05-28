const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function syncPasswords() {
  try {
    const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const Employee = mongoose.connection.db.collection('employees');

    // Update Saket
    const hashedSaket = await bcrypt.hash('Saket@123', 10);
    const res1 = await Employee.updateOne(
      { employeeId: 'EMP001' },
      { $set: { password: hashedSaket } }
    );
    console.log('Updated Saket Employee Password:', res1);

    // Update Vaibhav
    const hashedVaibhav = await bcrypt.hash('Innonsh@100', 10);
    const res2 = await Employee.updateOne(
      { employeeId: 'EMP003' },
      { $set: { password: hashedVaibhav } }
    );
    console.log('Updated Vaibhav Employee Password:', res2);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

syncPasswords();
