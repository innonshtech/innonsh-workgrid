const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    
    // Reactivate the incorrectly suspended onboarded org user
    const result = await users.updateOne(
        { email: 'info@innonsh.com' },
        { $set: { isActive: true, status: 'active' } }
    );
    
    console.log('Reactivated info@innonsh.com:', result.modifiedCount === 1);
    process.exit(0);
}
fix();
