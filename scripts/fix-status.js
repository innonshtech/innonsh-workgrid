const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Employee = mongoose.connection.collection('employees');
        
        // Update both status and organizationId (if missing)
        // Since it's a new setup, we might want to link them to the organization created during registration if any.
        // But for now, just fixing the status is enough to show them in dashboard.
        
        const res = await Employee.updateMany(
            { status: { $in: ['active', 'pending'] } }, 
            { $set: { status: 'Active' } }
        );
        
        console.log(`Successfully updated ${res.modifiedCount} employees.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
