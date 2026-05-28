
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

async function setupHRMManager() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const hrmTeamId = '69df3c225f9902501fe1d249';
  
  // Find Aniket (as manager)
  const aniket = await Employee.findOne({ 'personalDetails.firstName': /Aniket/i });
  
  if (aniket) {
    console.log('Found Aniket:', aniket._id);
    
    // Set Aniket as Team Lead for HRM Team
    await Team.findByIdAndUpdate(hrmTeamId, { teamLead: aniket._id });
    
    // Set Aniket as Reporting Manager for Saket and Vaibhav
    await Employee.updateMany(
      { 
        $or: [
          { 'personalDetails.firstName': /Saket/i },
          { 'personalDetails.firstName': /Vaibhav/i }
        ],
        'jobDetails.teamId': new mongoose.Types.ObjectId(hrmTeamId)
      },
      { 
        $set: { 
          'jobDetails.reportingManager': aniket._id,
          'jobDetails.teamLead': aniket._id 
        } 
      }
    );
    console.log('Updated Saket and Vaibhav reporting manager to Aniket.');
  } else {
    console.error('Aniket not found');
  }

  await mongoose.disconnect();
}

setupHRMManager();
