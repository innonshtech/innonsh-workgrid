
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

async function setupManagers() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Doctor Team
  const doctorTeamId = '69fc365a74dec029f801a4c6';
  const rahulId = '69fd02c1f964a4574944ca0a'; // I'll search for Rahul's ID properly in a moment
  
  const rahul = await Employee.findOne({ 'personalDetails.firstName': /Rahul/i });
  if (rahul) {
    console.log('Found Rahul:', rahul._id);
    
    // Set Rahul as Team Lead for Doctor Team
    await Team.findByIdAndUpdate(doctorTeamId, { teamLead: rahul._id });
    
    // Set Rahul as Reporting Manager for Chetna and Priya
    await Employee.updateMany(
      { 
        $or: [
          { 'personalDetails.firstName': /Chetna/i },
          { 'personalDetails.firstName': /Priya/i }
        ],
        _id: { $ne: rahul._id }
      },
      { 
        $set: { 
          'jobDetails.reportingManager': rahul._id,
          'jobDetails.teamLead': rahul._id 
        } 
      }
    );
    console.log('Updated Chetna and Priya reporting manager to Rahul.');
  } else {
    console.error('Rahul not found');
  }

  await mongoose.disconnect();
}

setupManagers();
