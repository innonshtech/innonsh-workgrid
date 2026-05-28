const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setup() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const Employee = mongoose.connection.collection('employees');

    const newPassword = await bcrypt.hash('password123', 10);

    // 1. Update Admin
    // Try to rename the existing softtech.com admin if it exists
    await User.updateOne(
        { email: 'admin@softtech.com' },
        { $set: { email: 'admin@example.com' } }
    );

    // Upsert the admin@example.com to make sure it's fully ready
    await User.updateOne(
        { email: 'admin@example.com' },
        {
            $set: {
                password: newPassword,
                role: 'admin',
                name: 'System Admin',
                employeeId: 'ADM001'
            }
        },
        { upsert: true }
    );
    console.log('✅ Admin set up: admin@example.com / password123');

    // 2. Setup Employee
    await Employee.updateOne(
        { employeeId: 'EMP001' },
        {
            $set: {
                password: newPassword,
                role: 'employee',
                'personalDetails.email': 'emp001@example.com',
                'personalDetails.firstName': 'Test',
                'personalDetails.lastName': 'Employee',
                'personalDetails.dateOfBirth': new Date('1990-01-01T00:00:00.000Z'),
                'jobDetails.designation': 'Software Developer',
                'jobDetails.department': 'Engineering'
            }
        },
        { upsert: true }
    );
    console.log('✅ Employee set up: EMP001 / password123');

    process.exit(0);
}

setup().catch(console.error);
