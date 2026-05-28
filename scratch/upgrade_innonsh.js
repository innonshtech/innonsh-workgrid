const mongoose = require('mongoose');
require('dotenv').config();

async function upgrade() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    
    // Upgrade the real org user so they don't expire
    const result = await users.updateOne(
        { email: 'info@innonsh.com' },
        { $set: { plan: 'enterprise', planExpiresAt: null } }
    );
    
    console.log('Upgraded info@innonsh.com to enterprise:', result.modifiedCount === 1);
    process.exit(0);
}
upgrade();
