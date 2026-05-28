import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function setupAprilTestData() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;

        // 1. Clear History
        await db.collection('payslips').deleteMany({});
        await db.collection('payrollruns').deleteMany({});
        console.log('🗑️ History cleared.');

        // 2. Find Saket
        const employee = await db.collection('employees').findOne({ "personalDetails.firstName": "Saket" });
        if (!employee) throw new Error("Employee Saket not found");
        const empId = employee._id;

        // 3. Update Joining Date
        await db.collection('employees').updateOne(
            { _id: empId },
            { $set: { "personalDetails.dateOfJoining": new Date("2026-04-01T00:00:00Z"), status: "Active" } }
        );
        console.log('📅 Joining date set.');

        // 4. Create Leave Record
        await db.collection('leaves').deleteMany({ employeeId: empId, month: 4, year: 2026 });
        await db.collection('leaves').insertOne({
            employeeId: empId,
            employeeCode: employee.employeeId,
            employeeName: `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
            organizationId: employee.jobDetails.organizationId,
            organizationType: employee.jobDetails.organization || "Company",
            department: employee.jobDetails.department || "General",
            month: 4,
            year: 2026,
            leaves: [
                { date: new Date("2026-04-05T00:00:00Z"), leaveType: "Unpaid", reason: "Personal" },
                { date: new Date("2026-04-06T00:00:00Z"), leaveType: "Unpaid", reason: "Personal" }
            ],
            summary: {
                totalDays: 2,
                unpaidLeaves: 2,
                paidLeaves: 0,
                halfDayPaidLeaves: 0,
                halfDayUnpaidLeaves: 0
            },
            annualLeaveBalance: {
                totalEntitled: 12,
                used: 2,
                remaining: 10,
                balanceAtMonthStart: 12,
                thisMonthUnpaid: 2
            },
            status: "Approved",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('🏖️ Leave record created.');

        // 5. Create Attendance for Overtime
        await db.collection('attendances').deleteMany({ employee: empId, date: { $gte: new Date("2026-04-01"), $lte: new Date("2026-04-30") } });
        await db.collection('attendances').insertMany([
            {
                employee: empId,
                organizationId: employee.jobDetails.organizationId,
                date: new Date("2026-04-10T00:00:00Z"),
                status: "Present",
                overtimeHours: 5,
                dayType: "Full",
                attendanceMethod: "Web",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                employee: empId,
                organizationId: employee.jobDetails.organizationId,
                date: new Date("2026-04-15T00:00:00Z"),
                status: "Present",
                overtimeHours: 3,
                dayType: "Full",
                attendanceMethod: "Web",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
        console.log('⏰ Overtime attendance created.');

        console.log('✅ Final setup complete.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setupAprilTestData();
