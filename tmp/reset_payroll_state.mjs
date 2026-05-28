import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function resetPayrollRuns() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('Resetting Payroll Runs...');
  const pr = await db.collection('payrollruns').deleteMany({});
  console.log(`Deleted ${pr.deletedCount} payroll runs.`);

  console.log('Resetting Batch Payslips...');
  const ps = await db.collection('payslips').deleteMany({ status: { $ne: 'Generated' } }); // Keep the manually generated one for testing
  console.log(`Deleted ${ps.deletedCount} draft/batch payslips.`);

  // Create default attendance summary for March 2026 for all 3 employees
  const employees = await db.collection('employees').find({}).toArray();
  const attendances = db.collection('attendances');

  // Let's check how the attendance schema expects the summary. 
  // Actually, wait, let's first check if there are attendances and if so delete them for March.
  await attendances.deleteMany({ month: 3, year: 2026 });

  for (const emp of employees) {
    if (!emp.jobDetails?.organizationId) continue; // Skip incomplete records

    // Insert dummy attendance 
    await attendances.insertOne({
      employee: emp._id,
      organizationId: emp.jobDetails.organizationId,
      month: 3,
      year: 2026,
      totalDays: 31,
      presentDays: 30, // 30 days present + 1 unpaid leave (for testing)
      paidLeaves: 0,
      unpaidLeaves: 1,
      lopDays: 1,
      status: 'Finalized',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Inserted attendance for ${emp.employeeId} - Present: 30, LOP: 1`);
  }

  await mongoose.disconnect();
}

resetPayrollRuns();
