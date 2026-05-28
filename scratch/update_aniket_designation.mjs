
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  'jobDetails.designation': String,
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function updateAniket() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await Employee.updateMany(
    { 'personalDetails.firstName': /Aniket/i },
    { $set: { 'jobDetails.designation': 'Team Leader' } }
  );

  console.log(`Updated ${result.modifiedCount} employees.`);
  
  await mongoose.disconnect();
}

updateAniket();
