const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function checkAdmins() {
    try {
        await mongoose.connect(dbUrl);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
        console.log(JSON.stringify(admins.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })), null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmins();
