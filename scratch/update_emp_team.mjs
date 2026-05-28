
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  jobDetails: {
    teamId: mongoose.Schema.Types.ObjectId,
    team: String
  }
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function updateEmployeesTeam() {
  await mongoose.connect(MONGODB_URI);
  
  const teamId = '69df3c225f9902501fe1d249'; // HRM Development team
  const employeeIds = [
    '69b91b7cccbf988b6f78c83e', // Aniket Patil
    '69f9ba2fe5b3b6bf11fffab5', // Saket Patil
    '69f9c6544e2de34dca21f687'  // Vaibhav Thorat
  ];

  const result = await Employee.updateMany(
    { _id: { $in: employeeIds } },
    { $set: { 'jobDetails.teamId': new mongoose.Types.ObjectId(teamId) } }
  );

  console.log(`Updated ${result.modifiedCount} employees.`);
  
  await mongoose.disconnect();
}

updateEmployeesTeam();
