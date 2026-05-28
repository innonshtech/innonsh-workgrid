import mongoose from "mongoose";

const MONGODB_URI = "mongodb://localhost:27017/bizmate";

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const payslipSchema = new mongoose.Schema({
    employee: mongoose.Schema.Types.ObjectId,
    payrollRunId: mongoose.Schema.Types.ObjectId,
    payslipId: String,
    month: Number,
    year: Number,
    netSalary: Number
  }, { strict: false });
  const Payslip = mongoose.model("Payslip", payslipSchema);

  const runSchema = new mongoose.Schema({
    runId: String,
    month: Number,
    year: Number,
    totalNetSalary: Number
  }, { strict: false });
  const PayrollRun = mongoose.model("PayrollRun", runSchema);

  const latestRun = await PayrollRun.findOne().sort({ createdAt: -1 });
  if (!latestRun) {
    console.log("No payroll run found");
    process.exit(0);
  }
  
  console.log("Latest Run:", latestRun.toJSON());

  const slips = await Payslip.find({ month: latestRun.month, year: latestRun.year }).lean();
  console.log(`Payslips for Month ${latestRun.month}:`, slips.length);
  
  if (slips.length > 0) {
    console.log("Sample payslip payrollRunId:", slips[0].payrollRunId);
    console.log("Latest run _id:", latestRun._id);
    console.log("Do they match?", String(slips[0].payrollRunId) === String(latestRun._id));
  }

  process.exit(0);
}

run().catch(console.error);
