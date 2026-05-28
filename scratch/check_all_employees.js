import dbConnect from '../src/lib/db/connect.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkAllEmployees() {
  await dbConnect();
  console.log("Fetching employees from DB...");
  const employees = await Employee.find({}).select('+password');
  console.log(`\nFound ${employees.length} employees:\n`);
  
  employees.forEach(emp => {
    console.log(`- Name: ${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName}`);
    console.log(`  Employee ID: "${emp.employeeId}"`);
    console.log(`  Email: "${emp.personalDetails?.email}"`);
    console.log(`  Role: "${emp.role}"`);
    console.log(`  Status: "${emp.status}"`);
    console.log(`  Password Set: ${!!emp.password}`);
    console.log(`  DOB: "${emp.personalDetails?.dateOfBirth}"`);
    console.log(`  --------------------------------------------`);
  });
  
  await mongoose.disconnect();
}

checkAllEmployees().catch(console.error);
