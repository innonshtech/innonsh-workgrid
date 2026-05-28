const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const users = db.collection('users');
        
        // Check if user already exists
        const existing = await users.findOne({ email: 'saket.innonsh@innonsh.com' });
        if (existing) {
            console.log('User already exists in Users collection');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('Saket@123', 12);
        
        const newUser = {
            name: 'Saket Patil',
            email: 'saket.innonsh@innonsh.com',
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            organizationId: new mongoose.Types.ObjectId("69b8f205ccbf988b6f78c397"),
            companyName: 'Innonsh Technologies',
            employeeId: 'EMP1561',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await users.insertOne(newUser);
        console.log('Successfully created login account for Saket Patil:', result.insertedId);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createLogin();
