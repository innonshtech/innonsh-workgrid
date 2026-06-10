const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  password: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected!');
    
    // Hash password "admin123"
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    console.log('New hash generated:', hash);
    
    // Update admin@acmecorp.demo
    const adminUser = await User.findOne({ email: 'admin@acmecorp.demo' });
    if (adminUser) {
      adminUser.password = hash;
      await adminUser.save();
      console.log('Updated password for admin@acmecorp.demo to admin123');
    } else {
      console.log('admin@acmecorp.demo not found!');
    }

    // Check if john.doe@acmecorp.demo has a User account, if not, let's find or create one or check existing employee user
    // Let's find an employee user
    const anyEmployee = await User.findOne({ role: 'employee' });
    if (anyEmployee) {
      console.log('Found employee user:', anyEmployee.email);
      anyEmployee.password = hash;
      await anyEmployee.save();
      console.log(`Updated password for ${anyEmployee.email} to admin123`);
    } else {
      // Create user for john.doe@acmecorp.demo if needed
      console.log('No employee user found in User collection. Let us look at all users again.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
