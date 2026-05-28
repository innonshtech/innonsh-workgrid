const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const Employee = mongoose.connection.collection('employees');

    const users = await User.find({}).limit(5).toArray();
    console.log('--- ADMIN/USERS ---');
    users.forEach(u => console.log(`Role: ${u.role}, Email: ${u.email}, EmployeeID: ${u.employeeId}, HasPassword: ${!!u.password}`));

    const emps = await Employee.find({}).limit(5).toArray();
    console.log('\n--- EMPLOYEES ---');
    emps.forEach(e => console.log(`EmployeeID: ${e.employeeId}, Email: ${e.personalDetails?.email}, DOB: ${e.personalDetails?.dateOfBirth}, HasPassword: ${!!e.password}, Role: ${e.role}`));

    process.exit(0);
}

check().catch(console.error);
