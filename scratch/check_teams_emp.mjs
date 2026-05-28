
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Mock schemas/models since we are running outside Next.js context with compiled modules
const teamSchema = new mongoose.Schema({
  name: String,
  departmentId: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema, 'teams');

const employeeSchema = new mongoose.Schema({
  employeeId: String,
  personalDetails: {
    firstName: String,
    lastName: String,
  },
  jobDetails: {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    departmentId: mongoose.Schema.Types.ObjectId,
  }
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function checkTeamsAndEmployees() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const teams = await Team.find({});
  console.log('--- Teams ---');
  teams.forEach(t => console.log(`ID: ${t._id}, Name: ${t.name}`));
  
  const employees = await Employee.find({}).populate('jobDetails.teamId');
  console.log('\n--- Employees ---');
  employees.forEach(e => {
    console.log(`ID: ${e._id}, Name: ${e.personalDetails?.firstName} ${e.personalDetails?.lastName}, Team: ${e.jobDetails?.teamId?.name || 'None'}`);
  });
  
  await mongoose.disconnect();
}

checkTeamsAndEmployees();
