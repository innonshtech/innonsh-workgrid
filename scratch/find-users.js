const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
console.log('Using database URI:', uri);

// Define user and employee schemas just enough to get fields
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  employeeId: String
});

const EmployeeSchema = new mongoose.Schema({
  employeeId: String,
  personalDetails: {
    firstName: String,
    lastName: String,
    email: String
  },
  role: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema, 'employees');

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB!');
    
    const users = await User.find({}, 'name email role employeeId').limit(10);
    console.log('\n--- USERS ---');
    console.log(users);

    const employees = await Employee.find({}, 'employeeId personalDetails role').limit(10);
    console.log('\n--- EMPLOYEES ---');
    console.log(employees);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error querying database:', err);
  }
}

run();
