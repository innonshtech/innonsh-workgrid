const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority";

async function run() {
    try {
        console.log("Connecting to DB to DELETE batch...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.");

        const PayrollRun = mongoose.models.PayrollRun || mongoose.model('PayrollRun', new mongoose.Schema({}, { strict: false }));
        const Payslip = mongoose.models.Payslip || mongoose.model('Payslip', new mongoose.Schema({}, { strict: false }));

        const month = 4;
        const year = 2026;

        // 1. Delete all Payslips for this month
        const payslipResult = await Payslip.deleteMany({ month, year });
        console.log(`Deleted ${payslipResult.deletedCount} payslips.`);

        // 2. Delete the Payroll Run batch
        const batchResult = await PayrollRun.deleteMany({ month, year });
        console.log(`Deleted ${batchResult.deletedCount} payroll batch(es).`);

        console.log("Cleanup Complete. You can now re-run the payroll for April 2026.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
