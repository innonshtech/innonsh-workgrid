// Fix all employees missing organization name string
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll?retryWrites=true&w=majority';

async function fixOrgs() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const employees = db.collection('employees');

  // Find org name from organizations collection
  const orgs = db.collection('organizations');
  const orgList = await orgs.find({}).toArray();
  console.log('Organizations:', orgList.map(o => `${o._id}: ${o.name}`));

  // Fix all employees that have organizationId but empty organization string
  const empsToFix = await employees.find({
    $or: [
      { 'jobDetails.organization': '' },
      { 'jobDetails.organization': null },
      { 'jobDetails.organization': { $exists: false } }
    ],
    'jobDetails.organizationId': { $ne: null }
  }).toArray();

  console.log(`\nFound ${empsToFix.length} employees with missing org name:`);
  for (const emp of empsToFix) {
    const orgId = emp.jobDetails?.organizationId;
    const org = orgList.find(o => o._id.toString() === orgId?.toString());
    const orgName = org?.name || 'Innonsh Technologies';
    
    console.log(`  Fixing ${emp.employeeId}: ${emp.personalDetails?.firstName} ${emp.personalDetails?.lastName} -> ${orgName}`);
    await employees.updateOne({ _id: emp._id }, { $set: { 'jobDetails.organization': orgName } });
  }

  console.log('\nDone!');
  await mongoose.disconnect();
}

fixOrgs().catch(err => { console.error(err); process.exit(1); });
