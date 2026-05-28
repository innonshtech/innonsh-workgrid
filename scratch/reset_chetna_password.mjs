
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  password: { type: String, select: false }
}, { strict: false });

// Pre-save hook to hash password (same as in the main model)
employeeSchema.pre('save', async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function resetPassword() {
  await mongoose.connect(MONGODB_URI);
  
  const empId = '69fc383474dec029f801a53b';
  const newPassword = 'Chetna@123';

  const employee = await Employee.findById(empId);
  if (!employee) {
    console.error('Employee not found');
    process.exit(1);
  }

  employee.password = newPassword;
  await employee.save();

  console.log(`Password reset successfully for Chetna Pakhlale.`);
  
  await mongoose.disconnect();
}

resetPassword();
