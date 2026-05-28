const mongoose = require('mongoose');

async function update() {
  try {
    const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas (hr_payroll)');

    const userSchema = new mongoose.Schema({ email: String, employeeId: String }, { strict: false });
    const User = mongoose.model('User', userSchema, 'users');

    const res1 = await User.updateOne(
      { email: 'saket.innonsh@innonsh.com' },
      { $set: { employeeId: 'EMP001' } }
    );
    console.log('Update Saket:', res1);

    const res2 = await User.updateOne(
      { email: 'vaibhav.innonsh@gmail.com' },
      { $set: { employeeId: 'EMP003' } }
    );
    console.log('Update Vaibhav:', res2);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

update();
