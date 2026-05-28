import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is missing in .env file");
    process.exit(1);
}

// Define the Candidate schema since we don't want to import the whole model setup
const CandidateSchema = new mongoose.Schema({}, { strict: false });
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);

async function clearRecruitmentData() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to hr_payroll database.");

        const candidateCount = await Candidate.countDocuments();
        console.log(`📊 Found ${candidateCount} candidates to clear.`);

        if (candidateCount > 0) {
            const result = await Candidate.deleteMany({});
            console.log(`✨ Successfully deleted ${result.deletedCount} candidates.`);
        } else {
            console.log("ℹ️ Pipeline is already empty.");
        }

        console.log("\n🚀 YOUR RECRUITMENT MODULE IS NOW FRESH!");
        console.log("You can now test new applications via the Careers Portal.");
        
    } catch (error) {
        console.error("❌ Error during cleanup:", error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

clearRecruitmentData();
