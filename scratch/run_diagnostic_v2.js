import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Employee from '../src/lib/db/models/payroll/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function diagnosticTest() {
    let log = "";
    const logFile = path.resolve(__dirname, 'diagnostic_results_v2.txt');

    try {
        await mongoose.connect(MONGODB_URI);
        log += "Connected to DB\n";

        const saket = await mongoose.model('Employee').findOne({ "personalDetails.firstName": "Saket" });
        if (!saket) {
            log += "ERROR: Saket not found\n";
        } else {
            log += `Testing for Saket (${saket.employeeId})\n`;
            
            // CORRECT ARGUMENTS: (statutoryConfig, params)
            const month = 4;
            const year = 2026;
            const result = await saket.calculateSalaryComponents(null, { month, year });
            
            log += `\n--- CALCULATION RESULTS ---\n`;
            log += `Total Days: ${result.totalDays}\n`;
            log += `Weekly Offs: ${result.weeklyOffs}\n`;
            log += `Working Days: ${result.workingDays}\n`;
            log += `Present Days: ${result.presentDays}\n`;
            log += `Paid Leaves: ${result.paidLeaves}\n`;
            log += `Unpaid (LOP): ${result.lopDays}\n`;
            log += `Paid Days: ${result.paidDays}\n`;
            log += `Overtime Hours: ${result.overtimeHours}\n`;
            log += `---------------------------\n`;
        }

        fs.writeFileSync(logFile, log);
        console.log("Diagnostic complete.");
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        log += `FATAL ERROR: ${error.message}\n${error.stack}\n`;
        fs.writeFileSync(logFile, log);
        console.error(error);
        process.exit(1);
    }
}

diagnosticTest();
