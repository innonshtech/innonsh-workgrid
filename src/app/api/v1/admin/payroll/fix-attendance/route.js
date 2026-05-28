import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import Payslip from '@/lib/db/models/payroll/Payslip';
import mongoose from 'mongoose';

export async function GET(req) {
    try {
        await dbConnect();
        
        const month = 4; // April
        const year = 2026;
        
        console.log(`[FixScript] Starting attendance sync for ${month}/${year}`);
        
        const payslips = await Payslip.find({ month, year });
        let updatedCount = 0;
        
        for (const payslip of payslips) {
            const employee = await Employee.findById(payslip.employee);
            if (!employee) continue;
            
            // Recalculate using the NEW GLOBAL LOGIC in Employee.js
            const result = await employee.calculateSalaryComponents(null, { 
                month, 
                year,
                workingDaysInMonth: payslip.totalDays 
            });
            
            // Update payslip fields
            payslip.presentDays = result.presentDays;
            payslip.paidDays = result.paidDays;
            payslip.paidLeaveDays = result.paidLeaves;
            payslip.unpaidLeaveDays = result.lopDays;
            
            await payslip.save();
            updatedCount++;
            console.log(`[FixScript] Updated ${employee.employeeId}: Present=${result.presentDays}, LOP=${result.lopDays}`);
        }
        
        return NextResponse.json({ 
            success: true, 
            message: `Successfully updated ${updatedCount} payslips for April 2026.`,
            details: `Present Days logic (Working - LOP - Leaves) applied globally.`
        });
        
    } catch (error) {
        console.error('[FixScript] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
