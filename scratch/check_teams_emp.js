
import mongoose from 'mongoose';
import dbConnect from './src/lib/db/connect.js';
import Employee from './src/lib/db/models/payroll/Employee.js';
import Team from './src/lib/db/models/crm/organization/Team.js';

async function checkTeamsAndEmployees() {
  await dbConnect();
  
  const teams = await Team.find({});
  console.log('--- Teams ---');
  teams.forEach(t => console.log(`ID: ${t._id}, Name: ${t.name}`));
  
  const employees = await Employee.find({}).populate('jobDetails.teamId');
  console.log('\n--- Employees ---');
  employees.forEach(e => {
    console.log(`ID: ${e._id}, Name: ${e.personalDetails.firstName} ${e.personalDetails.lastName}, Team: ${e.jobDetails?.teamId?.name || 'None'}`);
  });
  
  process.exit(0);
}

checkTeamsAndEmployees();
