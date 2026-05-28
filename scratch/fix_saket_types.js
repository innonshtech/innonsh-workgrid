const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('employees');
        
        // Convert the string ID to a proper ObjectId
        const orgId = new mongoose.Types.ObjectId("69b8f205ccbf988b6f78c397");
        const deptId = new mongoose.Types.ObjectId("69b8f24eccbf988b6f78c3c1");

        const result = await collection.updateOne(
            { 'personalDetails.firstName': 'Saket' },
            { 
                $set: { 
                    'jobDetails.organizationId': orgId,
                    'jobDetails.departmentId': deptId
                } 
            }
        );
        
        console.log('Successfully fixed Saket organizationId type:', result.modifiedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
