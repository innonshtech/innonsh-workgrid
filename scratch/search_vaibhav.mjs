
import dbConnect from '../src/lib/db/connect.js';
import User from '../src/lib/db/models/User.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function searchVaibhav() {
    await dbConnect();
    
    console.log(`Searching for "Vaibhav" in collections...`);
    
    const users = await User.find({ name: { $regex: /Vaibhav/i } });
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.name} (${u.email}), Role: ${u.role}, EmployeeId: ${u.employeeId}`));
    
    const employees = await Employee.find({ 
        $or: [
            { 'personalDetails.firstName': { $regex: /Vaibhav/i } },
            { 'personalDetails.lastName': { $regex: /Vaibhav/i } }
        ]
    }).select('+password');
    
    console.log(`Found ${employees.length} employees:`);
    employees.forEach(e => console.log(`- ${e.personalDetails.firstName} ${e.personalDetails.lastName} (${e.personalDetails.email}), EmpId: ${e.employeeId}, HasPassword: ${!!e.password}, DOB: ${e.personalDetails.dateOfBirth}`));
    
    process.exit(0);
}

searchVaibhav().catch(err => {
    console.error(err);
    process.exit(1);
});
