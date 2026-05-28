import mongoose from "mongoose";

const MONGODB_URI = "mongodb://localhost:27017/bizmate";

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const runSchema = new mongoose.Schema({}, { strict: false });
    const PayrollRun = mongoose.model("PayrollRun", runSchema);

    // Find and delete runs where employeesProcessed is not set or is 0
    const result = await PayrollRun.deleteMany({
      $or: [
        { employeesProcessed: { $exists: false } },
        { employeesProcessed: 0 }
      ]
    });

    console.log(`Cleaned up ${result.deletedCount} empty/orphaned payroll runs.`);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

cleanup();
