import dbConnect from './src/lib/db/connect.js';
import PayrollRun from './src/lib/db/models/payroll/PayrollRun.js';
import mongoose from 'mongoose';

async function checkRuns() {
    await dbConnect();
    console.log("Checking PayrollRuns for March 2026...");
    const runs = await PayrollRun.find({ month: 3, year: 2026 }).populate('organizationId', 'name');
    console.log(`Found ${runs.length} runs.`);
    runs.forEach(r => {
        console.log(`- ID: ${r._id}, RunID: ${r.runId}, Org: ${r.organizationId?.name} (${r.organizationId?._id}), Status: ${r.status}`);
    });
    process.exit(0);
}

checkRuns().catch(err => {
    console.error(err);
    process.exit(1);
});
