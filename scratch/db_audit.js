const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('employees');
        
        const total = await collection.countDocuments({});
        const roles = await collection.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();
        
        const all = await collection.find({}).project({ 'personalDetails.firstName': 1, role: 1, status: 1 }).toArray();
        
        console.log('Total Count:', total);
        console.log('Role Distribution:', roles);
        console.log('All Employees:', all);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
