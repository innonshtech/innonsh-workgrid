import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
}

async function clearPayrollHistory() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // Define models locally to avoid import issues
        const Payslip = mongoose.models.Payslip || mongoose.model('Payslip', new mongoose.Schema({}, { strict: false }));
        const PayrollRun = mongoose.models.PayrollRun || mongoose.model('PayrollRun', new mongoose.Schema({}, { strict: false }));
        const RetroAdjustment = mongoose.models.RetroAdjustment || mongoose.model('RetroAdjustment', new mongoose.Schema({}, { strict: false }));

        console.log('Clearing Payslips...');
        const payslipResult = await Payslip.deleteMany({});
        console.log(`Deleted ${payslipResult.deletedCount} payslips.`);

        console.log('Clearing Payroll Runs...');
        const runResult = await PayrollRun.deleteMany({});
        console.log(`Deleted ${runResult.deletedCount} payroll runs.`);

        console.log('Resetting Retro Adjustments...');
        const retroResult = await RetroAdjustment.updateMany(
            { status: 'Applied' },
            { status: 'Pending', $unset: { appliedInMonth: "", appliedInYear: "" } }
        );
        console.log(`Reset ${retroResult.modifiedCount} retro adjustments.`);

        console.log('✅ Payroll history cleared successfully.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing history:', error);
        process.exit(1);
    }
}

clearPayrollHistory();
