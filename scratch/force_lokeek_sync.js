import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect.js';
import LeaveApplication from '../src/lib/db/models/payroll/LeaveApplication.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import Leave from '../src/lib/db/models/payroll/Leave.js';

async function forceSync() {
    await dbConnect();
    const lokeek = await Employee.findOne({ "personalDetails.firstName": "Lokeek" });
    if (!lokeek) return console.log("Lokeek not found");

    const apps = await LeaveApplication.find({ 
        employee: lokeek._id, 
        status: { $regex: /^approved$/i } 
    });

    console.log(`Syncing ${apps.length} apps for Lokeek...`);

    // Manual distinct date collection (simple work-day check)
    const distinctDates = new Set();
    apps.forEach(app => {
        let curr = new Date(app.startDate);
        const end = new Date(app.endDate);
        while (curr <= end) {
            const day = curr.getDay();
            if (day !== 0 && day !== 6) { // Skip Sat/Sun
                distinctDates.add(curr.toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }
    });

    const dateList = Array.from(distinctDates).sort();
    console.log(`Found ${dateList.length} distinct working days:`, dateList);

    // Group by month
    const months = {};
    dateList.forEach(d => {
        const [y, m] = d.split('-');
        const key = `${y}-${parseInt(m)}`;
        if (!months[key]) months[key] = [];
        months[key].push(d);
    });

    for (const key in months) {
        const [year, month] = key.split('-').map(Number);
        const dates = months[key];

        let record = await Leave.findOne({ employeeId: lokeek._id, month, year });
        if (!record) {
            record = new Leave({
                employeeId: lokeek._id,
                employeeCode: lokeek.employeeId,
                employeeName: lokeek.personalDetails.firstName + " " + lokeek.personalDetails.lastName,
                month, year, leaves: [], status: 'Approved',
                organizationId: lokeek.jobDetails.organizationId
            });
        }
        
        record.leaves = dates.map(d => ({
            date: new Date(d),
            leaveType: 'Paid',
            reason: 'Synced Approved Leave',
            status: 'Approved'
        }));
        
        record.status = 'Approved';
        record.calculateSummary();
        await record.save();
        console.log(`Updated Month ${month}: ${record.summary.paidLeaves} days`);
    }

    // Trigger YTD refresh
    const apr = await Leave.findOne({ employeeId: lokeek._id, month: 4, year: 2026 });
    if (apr) await apr.updateAnnualBalance();

    process.exit(0);
}

forceSync().catch(console.error);
