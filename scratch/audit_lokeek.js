import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect.js';
import LeaveApplication from '../src/lib/db/models/payroll/LeaveApplication.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';

async function audit() {
    await dbConnect();
    const lokeek = await Employee.findOne({ "personalDetails.firstName": "Lokeek" });
    if (!lokeek) {
        console.log("Lokeek not found");
        process.exit(1);
    }

    const apps = await LeaveApplication.find({ employee: lokeek._id });
    console.log(`FOUND ${apps.length} applications for Lokeek:`);
    apps.forEach(app => {
        console.log(`- [${app.status}] ${app.leaveType}: ${app.startDate.toISOString().split('T')[0]} to ${app.endDate.toISOString().split('T')[0]} (Total: ${app.totalDays})`);
    });
    process.exit(0);
}

audit().catch(console.error);
