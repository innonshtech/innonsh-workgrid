const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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
    const users = await User.find({});
    console.log('Users list:');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.role}, HasPassword: ${!!u.password}, PasswordHash: ${u.password}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
