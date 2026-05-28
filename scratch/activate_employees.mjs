
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  status: String,
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function activateEmployees() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await Employee.updateMany(
    { 
      'personalDetails.firstName': { $in: [/Aniket/i, /Saket/i, /Vaibhav/i, /Chetna/i, /Rahul/i, /Priya/i] } 
    },
    { $set: { status: 'Active' } }
  );

  console.log(`Activated ${result.modifiedCount} employees.`);
  
  await mongoose.disconnect();
}

activateEmployees();
