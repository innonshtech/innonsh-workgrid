import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import dbConnect from '../src/lib/db/connect.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import Leave from '../src/lib/db/models/payroll/Leave.js';
import Attendance from '../src/lib/db/models/payroll/Attendance.js';

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

        // 2. Find a test employee (Saket)
        const employee = await db.collection('employees').findOne({ "personalDetails.firstName": "Saket" });
        if (!employee) throw new Error("Employee Saket not found");
        const empId = employee._id;

        // 3. Update Joining Date and Shift
        await db.collection('employees').updateOne(
            { _id: empId },
            { 
                $set: { 
                    "personalDetails.dateOfJoining": new Date("2026-04-01T00:00:00Z"),
                    status: "Active"
                } 
            }
        );
        console.log('📅 Joining date set to 01-04-2026.');

        // 4. Create 2 Unpaid Leaves (LOP) for April
        const Leave = mongoose.models.Leave || mongoose.model('Leave');
        await Leave.deleteMany({ employeeId: empId, month: 4, year: 2026 });
        await Leave.create({
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
            status: "Approved"
        });
        console.log('🏖️ 2 Unpaid leaves added for April.');

        // 5. Create Overtime for April
        const Attendance = mongoose.models.Attendance || mongoose.model('Attendance');
        await Attendance.deleteMany({ employee: empId, date: { $gte: new Date("2026-04-01"), $lte: new Date("2026-04-30") } });
        
        await Attendance.create({
            employee: empId,
            organizationId: employee.jobDetails.organizationId,
            date: new Date("2026-04-10T00:00:00Z"),
            status: "Present",
            overtimeHours: 5,
            dayType: "Full",
            attendanceMethod: "Web"
        });
        
        await Attendance.create({
            employee: empId,
            organizationId: employee.jobDetails.organizationId,
            date: new Date("2026-04-15T00:00:00Z"),
            status: "Present",
            overtimeHours: 3,
            dayType: "Full",
            attendanceMethod: "Web"
        });
        console.log('⏰ 8 Hours of Overtime added.');

        console.log('✅ Setup complete for April 2026.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up April data:', error);
        process.exit(1);
    }
}

setupAprilTestData();
