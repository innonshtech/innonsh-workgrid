import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CostCenter from '../src/lib/db/models/finance/CostCenter.js';
import Expense from '../src/lib/db/models/finance/Expense.js';
import JournalEntry from '../src/lib/db/models/finance/JournalEntry.js';
import { Vendor } from '../src/lib/db/models/finance/Vendor.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';

dotenv.config();

async function seedFinance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Create Cost Centers
        await CostCenter.deleteMany({});
        const costCenters = await CostCenter.create([
            { code: 'ENG-001', name: 'Engineering', budget: 5000000, status: 'Active' },
            { code: 'MKT-002', name: 'Marketing', budget: 2000000, status: 'Active' },
            { code: 'ADM-003', name: 'Administration', budget: 1500000, status: 'Active' },
            { code: 'SAL-004', name: 'Sales', budget: 3000000, status: 'Active' }
        ]);
        console.log("Seeded Cost Centers");

        // 2. Create Vendors
        await Vendor.deleteMany({});
        const vendors = await Vendor.create([
            { name: 'Synture Tech Solutions', category: 'IT Services', email: 'billing@synture.com', gstin: '27AAAAA0000A1Z5', status: 'Active' },
            { name: 'Cloud Host Pro', category: 'Software', email: 'finance@cloudhost.com', gstin: '27BBBBB0000B1Z5', status: 'Active' },
            { name: 'Luxury Travels', category: 'Travel', email: 'booking@luxury.com', status: 'Active' }
        ]);
        console.log("Seeded Vendors");

        // 3. Get an employee for expenses
        const employee = await Employee.findOne();
        if (employee) {
            await Expense.deleteMany({});
            await Expense.create([
                {
                    employee: employee._id,
                    title: 'Visit to Client Site - Delhi',
                    category: 'Travel',
                    amount: 12500,
                    date: new Date(),
                    status: 'Approved',
                    costCenter: costCenters[0]._id,
                    description: 'Flight and taxi charges'
                },
                {
                    employee: employee._id,
                    title: 'Team Dinner',
                    category: 'Food',
                    amount: 4500,
                    date: new Date(),
                    status: 'Pending',
                    costCenter: costCenters[0]._id
                }
            ]);
            console.log("Seeded Expenses");
        }

        // 4. Create Ledger Entries
        await JournalEntry.deleteMany({});
        await JournalEntry.create([
            {
                referenceNumber: 'JE-202401-001',
                description: 'Monthly Salary Accrual - January 2024',
                source: 'Payroll',
                date: new Date(2024, 0, 31),
                lines: [
                    { accountName: 'Salary Expense', accountType: 'Expense', debit: 1200000, credit: 0, costCenter: costCenters[0]._id },
                    { accountName: 'Staff Welfare', accountType: 'Expense', debit: 50000, credit: 0, costCenter: costCenters[1]._id },
                    { accountName: 'Salary Payable', accountType: 'Liability', debit: 0, credit: 1250000 }
                ],
                totalDebit: 1250000,
                totalCredit: 1250000
            }
        ]);
        console.log("Seeded Journal Entries");

        console.log("Finance Seeding Completed!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seedFinance();
