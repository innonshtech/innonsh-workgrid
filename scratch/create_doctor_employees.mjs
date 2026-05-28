
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Use simple schemas for the script
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  password: { type: String },
  personalDetails: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    dateOfJoining: Date,
  },
  jobDetails: {
    department: String,
    departmentId: mongoose.Schema.Types.ObjectId,
    organization: String,
    organizationId: mongoose.Schema.Types.ObjectId,
    teamId: mongoose.Schema.Types.ObjectId,
    designation: String,
    reportingManager: mongoose.Schema.Types.ObjectId,
  },
  salaryDetails: {
    bankAccount: {
      accountNumber: String,
      bankName: String,
      ifscCode: String,
    }
  },
  payslipStructure: {
    salaryType: String,
    basicSalary: Number,
    earnings: Array,
    deductions: Array,
  },
  workingHr: Number,
  status: { type: String, default: 'Active' },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { strict: false });

employeeSchema.pre('save', async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function createEmployees() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const orgId = '69b8f205ccbf988b6f78c397'; // Innonsh Technologies
  const deptId = '69b8f24eccbf988b6f78c3cb'; // Marketing (where Doctor Team is)
  const teamId = '69fc365a74dec029f801a4c6'; // Doctor Team
  const adminId = '674e92d8ce08af0109923297'; // Default Admin

  // Helper to generate next Employee ID
  const lastEmployee = await Employee.findOne().sort({ createdAt: -1 });
  const lastIdNumber = parseInt((lastEmployee?.employeeId || "EMP000").replace(/\D/g, "")) || 0;
  
  const genId = (offset) => `EMP${String(lastIdNumber + offset).padStart(3, "0")}`;

  // 1. Create Manager (Dr. Rahul Sharma)
  const managerData = {
    employeeId: genId(1),
    password: 'Password@123',
    personalDetails: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@dummy.com',
      phone: '9876543210',
      dateOfJoining: new Date(),
      gender: 'Male',
    },
    jobDetails: {
      department: 'Marketing',
      departmentId: new mongoose.Types.ObjectId(deptId),
      organization: 'Innonsh Technologies',
      organizationId: new mongoose.Types.ObjectId(orgId),
      teamId: new mongoose.Types.ObjectId(teamId),
      designation: 'Senior Consultant (Manager)',
    },
    salaryDetails: {
      bankAccount: {
        accountNumber: '1234567890',
        bankName: 'Dummy Bank',
        ifscCode: 'DUMY0001234',
      },
      aadharNumber: '123412341234',
    },
    payslipStructure: {
      salaryType: 'monthly',
      basicSalary: 50000,
      earnings: [],
      deductions: [],
    },
    workingHr: 9,
    status: 'Active',
    createdBy: new mongoose.Types.ObjectId(adminId),
  };

  const manager = await Employee.create(managerData);
  console.log(`Manager created: ${manager.personalDetails.firstName} (ID: ${manager.employeeId})`);

  // 2. Create Employee (Dr. Priya Verma)
  const employeeData = {
    employeeId: genId(2),
    password: 'Password@123',
    personalDetails: {
      firstName: 'Priya',
      lastName: 'Verma',
      email: 'priya.verma@dummy.com',
      phone: '9876543211',
      dateOfJoining: new Date(),
      gender: 'Female',
    },
    jobDetails: {
      department: 'Marketing',
      departmentId: new mongoose.Types.ObjectId(deptId),
      organization: 'Innonsh Technologies',
      organizationId: new mongoose.Types.ObjectId(orgId),
      teamId: new mongoose.Types.ObjectId(teamId),
      designation: 'Junior Doctor',
      reportingManager: manager._id,
    },
    salaryDetails: {
      bankAccount: {
        accountNumber: '1234567891',
        bankName: 'Dummy Bank',
        ifscCode: 'DUMY0001234',
      },
      aadharNumber: '123412341235',
    },
    payslipStructure: {
      salaryType: 'monthly',
      basicSalary: 35000,
      earnings: [],
      deductions: [],
    },
    workingHr: 9,
    status: 'Active',
    createdBy: new mongoose.Types.ObjectId(adminId),
  };

  const employee = await Employee.create(employeeData);
  console.log(`Employee created: ${employee.personalDetails.firstName} (ID: ${employee.employeeId})`);

  await mongoose.disconnect();
}

createEmployees();
