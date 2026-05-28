const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });

// Define Models inline to avoid import issues in this environment
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  employeeId: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const EmployeeSchema = new mongoose.Schema({
  employeeId: String,
  personalDetails: { firstName: String, lastName: String },
  userId: mongoose.Schema.Types.ObjectId
});
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

const LeaveApplicationSchema = new mongoose.Schema({
  employee: mongoose.Schema.Types.ObjectId,
  status: String,
  approvalChain: [{
    approverId: mongoose.Schema.Types.ObjectId,
    status: String
  }]
});
const LeaveApplication = mongoose.models.LeaveApplication || mongoose.model('LeaveApplication', LeaveApplicationSchema);

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const users = await User.find({ name: /Aniket/i });
    console.log('Aniket Users:', JSON.stringify(users, null, 2));

    const employees = await Employee.find({ 'personalDetails.firstName': /Aniket/i });
    console.log('Aniket Employees:', JSON.stringify(employees, null, 2));

    const apps = await LeaveApplication.find({ status: 'Pending' }).populate('employee', 'personalDetails.firstName');
    console.log('Pending Leave Applications:', JSON.stringify(apps, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
