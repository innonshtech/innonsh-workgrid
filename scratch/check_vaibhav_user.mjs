
import dbConnect from '../src/lib/db/connect.js';
import User from '../src/lib/db/models/User.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
    await dbConnect();
    const email = 'vaibhav.innonsh@gmail.com';
    
    console.log(`Checking for email: ${email}`);
    
    const user = await User.findOne({ email: { $regex: new RegExp("^" + email + "$", "i") } });
    if (user) {
        console.log('Found in User collection:');
        console.log({
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            hasPassword: !!user.password
        });
    } else {
        console.log('NOT found in User collection.');
    }
    
    const employee = await Employee.findOne({ 'personalDetails.email': { $regex: new RegExp("^" + email + "$", "i") } }).select('+password');
    if (employee) {
        console.log('Found in Employee collection:');
        console.log({
            id: employee._id,
            employeeId: employee.employeeId,
            email: employee.personalDetails.email,
            dob: employee.personalDetails.dateOfBirth,
            hasPassword: !!employee.password,
            designation: employee.jobDetails?.designation,
            status: employee.jobDetails?.status
        });
    } else {
        console.log('NOT found in Employee collection.');
    }
    
    process.exit(0);
}

checkUser().catch(err => {
    console.error(err);
    process.exit(1);
});
