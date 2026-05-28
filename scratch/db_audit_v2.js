const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('employees');
        
        const all = await collection.find({}).project({ 
            'personalDetails.firstName': 1, 
            role: 1, 
            status: 1,
            'jobDetails.organizationId': 1,
            'jobDetails.organization': 1
        }).toArray();
        
        console.log('All Employees with Org Info:');
        all.forEach(e => {
            console.log(`- ${e.personalDetails.firstName}: Role=${e.role}, OrgId=${e.jobDetails?.organizationId} (${typeof e.jobDetails?.organizationId}), OrgName=${e.jobDetails?.organization}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
