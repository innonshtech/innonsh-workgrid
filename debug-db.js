const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const Employee = mongoose.connection.collection('employees');

    const users = await User.find({}).toArray();
    console.log('--- ADMIN/USERS ---');
    for (const u of users) {
        console.log(`Email: ${u.email}, Role: ${u.role}, EmpID: ${u.employeeId}, password hash: ${u.password ? 'exists' : 'no'}`);
        if (u.password && u.email === 'admin@softtech.com') {
            const matches1 = await bcrypt.compare('123456', u.password);
            const matches2 = await bcrypt.compare('password', u.password);
            const matches3 = await bcrypt.compare('admin', u.password);
            console.log(`  Password Check: '123456'=${matches1}, 'password'=${matches2}, 'admin'=${matches3}`);
        }
    }

    const emps = await Employee.find({}).toArray();
    console.log('\n--- EMPLOYEES ---');
    for (const e of emps) {
        const rawDob = e.personalDetails?.dateOfBirth;
        let dobStr = 'N/A';
        if (rawDob) {
            dobStr = new Date(rawDob).toISOString();
        }
        console.log(`EmpID: ${e.employeeId}, Email: ${e.personalDetails?.email}, DOB: ${dobStr}, Password hash: ${e.password ? 'exists' : 'no'}`);
    }

    process.exit(0);
}

check().catch(console.error);
