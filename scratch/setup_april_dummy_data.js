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

        // April 2026 Details
        const month = 4;
        const year = 2026;

        // 1. Clear existing April data
        await db.collection('leaves').deleteMany({ month, year });
        await db.collection('attendances').deleteMany({ 
            date: { $gte: new Date(year, month-1, 1), $lte: new Date(year, month-1, 30, 23, 59, 59) } 
        });
        await db.collection('payslips').deleteMany({ month, year });
        await db.collection('payrollruns').deleteMany({ month, year });
        console.log('🗑️ April 2026 data cleared.');

        // 2. Fetch employees
        const saket = await db.collection('employees').findOne({ "personalDetails.firstName": "Saket" });
        const vaibhav = await db.collection('employees').findOne({ "personalDetails.firstName": "Vaibhav" });

        if (!saket || !vaibhav) throw new Error("Saket or Vaibhav not found");

        const testConfigs = [
            {
                emp: saket,
                unpaid: 2,
                paid: 0,
                ot: 10,
                presentDays: 20 // 22 (Working) - 2 (Unpaid)
            },
            {
                emp: vaibhav,
                unpaid: 2,
                paid: 2,
                ot: 5,
                presentDays: 18 // 22 (Working) - 2 (Unpaid) - 2 (Paid Leave)
            }
        ];

        for (const config of testConfigs) {
            const { emp, unpaid, paid, ot, presentDays } = config;
            const empId = emp._id;

            // Set joining date to ensure they are active in April
            await db.collection('employees').updateOne(
                { _id: empId },
                { $set: { "personalDetails.dateOfJoining": new Date("2026-01-01T00:00:00Z"), status: "Active" } }
            );

            // Create Leave Record
            await db.collection('leaves').insertOne({
                employeeId: empId,
                employeeCode: emp.employeeId,
                employeeName: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                organizationId: emp.jobDetails.organizationId,
                organizationType: emp.jobDetails.organization || "Company",
                department: emp.jobDetails.department || "General",
                month,
                year,
                summary: {
                    totalDays: unpaid + paid,
                    unpaidLeaves: unpaid,
                    paidLeaves: paid,
                    halfDayPaidLeaves: 0,
                    halfDayUnpaidLeaves: 0
                },
                status: "Approved",
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Create Attendance for Overtime and Present Days
            // We'll just create a few records to simulate the counts
            const attendanceRecords = [];
            
            // Add Overtime record
            attendanceRecords.push({
                employee: empId,
                organizationId: emp.jobDetails.organizationId,
                date: new Date(year, month-1, 10),
                status: "Present",
                overtimeHours: ot,
                dayType: "Full",
                attendanceMethod: "Web",
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Add other present days to match the count
            for(let i=1; i < presentDays; i++) {
                // Skip weekends (simplified: just pick days 11, 12, etc. that aren't already used)
                attendanceRecords.push({
                    employee: empId,
                    organizationId: emp.jobDetails.organizationId,
                    date: new Date(year, month-1, 11 + i),
                    status: "Present",
                    overtimeHours: 0,
                    dayType: "Full",
                    attendanceMethod: "Web",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            await db.collection('attendances').insertMany(attendanceRecords);
            console.log(`✅ Data setup for ${emp.personalDetails.firstName}`);
        }

        console.log('🚀 April 2026 testing data is ready!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setupAprilTestData();
