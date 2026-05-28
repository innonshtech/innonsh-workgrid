import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect.js';
import LeaveApplication from '../src/lib/db/models/payroll/LeaveApplication.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';

async function verifyLokeek() {
    await dbConnect();
    console.log("Connected to DB");

    const lokeek = await Employee.findOne({ "personalDetails.firstName": "Lokeek" });
    if (!lokeek) {
        console.log("Lokeek not found");
        process.exit(1);
    }
    console.log(`Lokeek ID: ${lokeek._id}`);

    const apps = await LeaveApplication.find({ employee: lokeek._id }).sort({ startDate: -1 });
    console.log(`\n--- Approved Applications Found (${apps.length}) ---`);
    
    apps.forEach(app => {
        console.log(`[${app.status}] ${app.leaveType}: ${app.startDate.toDateString()} to ${app.endDate.toDateString()}`);
        console.log(`    Total Days (DB): ${app.totalDays}`);
        console.log(`    Reason: ${app.reason}`);
    });

    process.exit(0);
}

verifyLokeek().catch(err => {
    console.error(err);
    process.exit(1);
});
