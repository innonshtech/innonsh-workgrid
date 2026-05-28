const mongoose = require('mongoose');
require('dotenv').config();

async function fixSuperAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    
    // Reactivate and protect the superadmin account
    const result = await users.updateOne(
        { email: 'owner@bizmate.com' },
        { $set: { plan: 'enterprise', planExpiresAt: null, isActive: true, status: 'active' } }
    );
    
    console.log('Fixed owner@bizmate.com:', result.modifiedCount === 1);
    process.exit(0);
}
fixSuperAdmin();
