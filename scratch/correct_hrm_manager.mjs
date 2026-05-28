
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const teamSchema = new mongoose.Schema({
  teamLead: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema, 'teams');

const employeeSchema = new mongoose.Schema({
  'jobDetails.reportingManager': mongoose.Schema.Types.ObjectId,
  'jobDetails.teamLead': mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');

async function correctHRMManager() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const hrmTeamId = '69df3c225f9902501fe1d249';
  
  // Find Saket (as the correct manager)
  const saket = await Employee.findOne({ 'personalDetails.firstName': /Saket/i });
  
  if (saket) {
    console.log('Found Saket:', saket._id);
    
    // Set Saket as Team Lead for HRM Team
    await Team.findByIdAndUpdate(hrmTeamId, { teamLead: saket._id });
    
    // Set Saket as Reporting Manager for Vaibhav and Aniket
    await Employee.updateMany(
      { 
        $or: [
          { 'personalDetails.firstName': /Aniket/i },
          { 'personalDetails.firstName': /Vaibhav/i }
        ],
        _id: { $ne: saket._id }
      },
      { 
        $set: { 
          'jobDetails.reportingManager': saket._id,
          'jobDetails.teamLead': saket._id 
        } 
      }
    );
    console.log('Updated Vaibhav and Aniket reporting manager to Saket Patil.');
  } else {
    console.error('Saket not found');
  }

  await mongoose.disconnect();
}

correctHRMManager();
