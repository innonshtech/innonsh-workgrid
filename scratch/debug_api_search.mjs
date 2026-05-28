
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas to match the app
const employeeSchema = new mongoose.Schema({}, { strict: false });
const teamSchema = new mongoose.Schema({}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');
const Team = mongoose.models.Team || mongoose.model('Team', teamSchema, 'teams');

async function debugSearch() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const vaibhav = await Employee.findOne({ 'personalDetails.firstName': /Vaibhav/i });
  const authUserId = vaibhav._id;
  console.log('Auth User (Vaibhav) ID:', authUserId);

  const currentEmployee = await Employee.findById(authUserId).select('jobDetails.teamId');
  const teamId = currentEmployee?.jobDetails?.teamId;
  console.log('Team ID:', teamId);

  let teamLeadId = null;
  if (teamId) {
    const team = await Team.findById(teamId).select('teamLead');
    teamLeadId = team?.teamLead;
    console.log('Team Lead ID from Team collection:', teamLeadId);
  }

  const search = 'Aniket Patil';
  let query = {
    _id: { $ne: authUserId },
    status: 'Active'
  };

  if (teamId) {
    query['jobDetails.teamId'] = teamId;
  }

  const leadershipDesignations = [
    { 'jobDetails.designation': { $regex: 'Manager', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'HR', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'Lead', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'Admin', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'Director', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'VP', $options: 'i' } },
    { 'jobDetails.designation': { $regex: 'President', $options: 'i' } }
  ];

  const allowedApproverConditions = [...leadershipDesignations];
  if (teamLeadId) {
    allowedApproverConditions.push({ _id: teamLeadId });
  }

  const searchRegex = new RegExp(search, 'i');
  query.$and = [
    {
      $or: [
        { employeeId: searchRegex },
        { 'personalDetails.firstName': searchRegex },
        { 'personalDetails.lastName': searchRegex },
        { 'jobDetails.designation': searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$personalDetails.firstName', ' ', '$personalDetails.lastName'] },
              regex: search,
              options: 'i'
            }
          }
        }
      ]
    },
    { $or: allowedApproverConditions }
  ];

  console.log('Final Query:', JSON.stringify(query, null, 2));

  const results = await Employee.find(query).select('personalDetails.firstName personalDetails.lastName jobDetails.designation');
  console.log('Results Found:', results.length);
  results.forEach(r => console.log(`- ${r.personalDetails.firstName} ${r.personalDetails.lastName} (${r.jobDetails.designation})`));

  await mongoose.disconnect();
}

debugSearch();
