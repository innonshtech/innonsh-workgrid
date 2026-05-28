import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function setupTestSalaries() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const employees = db.collection('employees');

        const salaryStructure = {
            salaryType: 'monthly',
            basicSalary: 50000,
            grossSalary: 70000,
            earnings: [
                { name: 'House Rent Allowance', enabled: true, calculationType: 'percentage', percentage: 10 },
                { name: 'Transport Allowance', enabled: true, calculationType: 'fixed', fixedAmount: 5000 }
            ],
            deductions: [],
            totalEarnings: 60000,
            totalDeductions: 0,
            netSalary: 60000
        };

        // Update Saket and Vaibhav
        const result = await employees.updateMany(
            { personalDetails: { $exists: true }, status: 'Active' },
            { $set: { payslipStructure: salaryStructure, isCompliant: true, pfApplicable: 'yes', esicApplicable: 'no' } }
        );

        console.log(`✅ Updated ${result.modifiedCount} employees with default salary structure.`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up salaries:', error);
        process.exit(1);
    }
}

setupTestSalaries();
