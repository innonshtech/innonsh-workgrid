const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupVaibhav() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('Error: MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.connection.collection('users');
        const Employee = mongoose.connection.collection('employees');

        const email = 'vaibhav.innonsh@gmail.com';
        const password = 'Innonsh@100';
        const hashedPassword = await bcrypt.hash(password, 12);

        // 1. Create Admin Record
        const adminData = {
            name: 'Vaibhav',
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await User.updateOne(
            { email: email.toLowerCase() },
            { $set: adminData },
            { upsert: true }
        );
        console.log(`✅ Admin account ready for: ${email}`);

        // 2. Create Employee Record
        const employeeId = 'VAIBHAV001';
        const employeeData = {
            employeeId: employeeId,
            password: hashedPassword,
            role: 'employee',
            personalDetails: {
                firstName: 'Vaibhav',
                lastName: 'Innonsh',
                email: email.toLowerCase(),
                dateOfBirth: new Date('1990-01-01')
            },
            jobDetails: {
                designation: 'Administrator',
                department: 'Management',
                joiningDate: new Date(),
                status: 'active'
            },
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await Employee.updateOne(
            { 'personalDetails.email': email.toLowerCase() },
            { $set: employeeData },
            { upsert: true }
        );
        console.log(`✅ Employee account ready for: ${email} (ID: ${employeeId})`);

        console.log('\n-----------------------------------');
        console.log('Use these credentials for BOTH logins:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('\nFor Admin Login: Use Email');
        console.log('For Employee Login: Use Email or Employee ID (VAIBHAV001)');
        console.log('-----------------------------------\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up Vaibhav:', error);
        process.exit(1);
    }
}

setupVaibhav();
