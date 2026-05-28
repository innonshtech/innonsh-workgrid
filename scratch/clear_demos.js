const mongoose = require('mongoose');
require('dotenv').config();

async function clearDemoAccounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = mongoose.connection.collection('users');
        const demoRequests = mongoose.connection.collection('demorequests');
        const organizations = mongoose.connection.collection('organizations');
        
        console.log('🧹 Starting cleanup of demo accounts...');

        // 1. Delete all demo requests
        const demoReqResult = await demoRequests.deleteMany({});
        console.log(`✅ Deleted ${demoReqResult.deletedCount} records from demorequests`);

        // 2. Delete all trial admin users (Demo users)
        // We ensure we only delete 'trial' users to avoid touching real 'enterprise' accounts
        const userResult = await users.deleteMany({ 
            role: 'admin', 
            plan: 'trial' 
        });
        console.log(`✅ Deleted ${userResult.deletedCount} trial admin users`);

        // 3. Delete any Sandbox Organizations created
        const orgResult = await organizations.deleteMany({
            industry: 'Demo'
        });
        console.log(`✅ Deleted ${orgResult.deletedCount} sandbox organizations`);

        console.log('🎉 All demo accounts cleared successfully!');
    } catch (error) {
        console.error('Error clearing accounts:', error);
    } finally {
        process.exit(0);
    }
}

clearDemoAccounts();
