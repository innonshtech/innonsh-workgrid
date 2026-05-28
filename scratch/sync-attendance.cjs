const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority";

async function run() {
    try {
        console.log("Connecting to Cloud DB for FULL SYNC...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.");

        const Employee = mongoose.models.Employee || mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
        const Payslip = mongoose.models.Payslip || mongoose.model('Payslip', new mongoose.Schema({}, { strict: false }));

        const month = 4;
        const year = 2026;

        const payslips = await Payslip.find({ month, year });
        console.log(`Found ${payslips.length} payslips to fix.`);

        for (const payslip of payslips) {
            const emp = await Employee.findById(payslip.employee);
            if (!emp) continue;

            const totalDaysInMonth = payslip.totalDays || 30;
            const weeklyOffs = payslip.weeklyOffs || 0;
            const holidays = payslip.holidays || 0;
            const workingDays = totalDaysInMonth - weeklyOffs - holidays;
            const lopDays = payslip.unpaidLeaveDays || 0;

            const newPresentDays = Math.max(0, workingDays - lopDays - (payslip.paidLeaveDays || 0));
            const newPaidDays = Math.max(0, workingDays - lopDays);

            const standardBasic = payslip.basicSalary || 0; 
            
            const pfWageLimit = 15000 * (newPaidDays / workingDays);
            const pfWage = Math.min(standardBasic, pfWageLimit);
            const newPF = Math.round(pfWage * 0.12);

            console.log(`Updating ${emp.personalDetails?.firstName || emp.employeeId}: Present=${newPresentDays}, PF=${newPF}`);

            const updatedDeductions = payslip.deductions.map(d => {
                const doc = (typeof d.toObject === 'function') ? d.toObject() : d;
                if (doc.type.includes('PF') || doc.type.includes('Provident Fund')) {
                    return { ...doc, amount: newPF };
                }
                return doc;
            });

            await Payslip.updateOne({ _id: payslip._id }, { 
                $set: { 
                    presentDays: newPresentDays,
                    paidDays: newPaidDays,
                    deductions: updatedDeductions
                } 
            });
        }

        console.log("Full Sync Complete.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
