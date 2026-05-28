import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from '../src/lib/db/models/payroll/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function runTestPayroll() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const month = 4;
        const year = 2026;
        
        const saket = await mongoose.model('Employee').findOne({ "personalDetails.firstName": "Saket" });
        if (!saket) throw new Error("Saket not found");

        console.log(`Running calculation for ${saket.personalDetails.firstName} (April 2026)...`);
        
        // We need to pass the same parameters the API passes
        const result = await saket.calculateSalaryComponents(month, year, {
            organizationId: saket.jobDetails.organizationId
        });

        console.log('\n--- CALCULATION RESULT ---');
        console.log(`Total Days: ${result.totalDays}`);
        console.log(`Weekly Offs: ${result.weeklyOffs}`);
        console.log(`Working Days: ${result.workingDays}`);
        console.log(`Present Days: ${result.presentDays}`);
        console.log(`Paid Leaves: ${result.paidLeaves}`);
        console.log(`Unpaid (LOP): ${result.lopDays}`);
        console.log(`Paid Days: ${result.paidDays}`);
        console.log(`Overtime Hours: ${result.overtimeHours}`);
        console.log('--------------------------\n');

        // Validation
        const expected = {
            totalDays: 30,
            weeklyOffs: 8,
            workingDays: 22,
            lopDays: 2,
            paidDays: 20,
            overtimeHours: 8
        };

        let passed = true;
        for (const key in expected) {
            if (result[key] !== expected[key]) {
                console.error(`❌ Mismatch in ${key}: Expected ${expected[key]}, got ${result[key]}`);
                passed = false;
            } else {
                console.log(`✅ ${key} matches.`);
            }
        }

        if (passed) {
            console.log('\n🎉 ALL CALCULATIONS ARE CORRECT!');
        } else {
            console.log('\n⚠️ Some calculations did not match.');
        }

        await mongoose.disconnect();
        process.exit(passed ? 0 : 1);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

runTestPayroll();
