const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function cleanupAdmins() {
    try {
        await mongoose.connect(dbUrl);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        // Keep these two
        const emailsToKeep = ['aniket.innonsh@gmail.com', 'aniket.innonsh1@gmail.com'];
        
        const res = await User.deleteMany({ 
            role: { $in: ['admin', 'super_admin'] },
            email: { $nin: emailsToKeep }
        });
        
        console.log('Deleted Admins:', res.deletedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanupAdmins();
