import mongoose from 'mongoose';
import dbConnect from './src/lib/db/connect.js';
import Employee from './src/lib/db/models/payroll/Employee.js';

async function check() {
    await dbConnect();
    const employees = await Employee.find().populate('jobDetails.departmentId jobDetails.teamId');
    employees.forEach(e => {
        console.log(`Name: ${e.personalDetails.firstName} ${e.personalDetails.lastName}`);
        console.log(`ID: ${e._id}`);
        console.log(`Dept: ${e.jobDetails?.departmentId?.departmentName || e.jobDetails?.department}`);
        console.log(`Team: ${e.jobDetails?.teamId?.name}`);
        console.log('---');
    });
    process.exit(0);
}

check();
