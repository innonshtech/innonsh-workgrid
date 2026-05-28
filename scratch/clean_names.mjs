
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  'personalDetails.firstName': String,
  'personalDetails.lastName': String,
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function cleanNames() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const employees = await Employee.find({ 
    $or: [
      { 'personalDetails.firstName': / $/ },
      { 'personalDetails.lastName': / $/ }
    ]
  });

  for (const emp of employees) {
    const newFirstName = emp.personalDetails.firstName.trim();
    const newLastName = emp.personalDetails.lastName.trim();
    await Employee.findByIdAndUpdate(emp._id, {
      'personalDetails.firstName': newFirstName,
      'personalDetails.lastName': newLastName
    });
    console.log(`Cleaned: ${newFirstName} ${newLastName}`);
  }

  await mongoose.disconnect();
}

cleanNames();
