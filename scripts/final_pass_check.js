const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));

        const admin = await User.findOne({ email: 'admin@example.com' });
        const emp = await Employee.findOne({ employeeId: 'EMP001' });

        console.log('Admin Email:', admin.email);
        console.log('- Password Match (password12):', await bcrypt.compare('password12', admin.password));

        console.log('Employee ID:', emp.employeeId);
        console.log('- Password Match (password12):', await bcrypt.compare('password12', emp.password));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
