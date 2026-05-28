
import dbConnect from '../src/lib/db/connect.js';
import User from '../src/lib/db/models/User.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function syncVaibhavPassword() {
    await dbConnect();
    const email = 'vaibhav.innonsh@gmail.com';
    
    console.log(`Step 1: Finding Admin User record for ${email}...`);
    const user = await User.findOne({ email: { $regex: new RegExp("^" + email + "$", "i") } });
    
    if (!user || !user.password) {
        console.error('ERROR: Could not find Admin User or password for this email.');
        process.exit(1);
    }
    
    const adminHashedPassword = user.password;
    console.log('Admin password found (hashed).');
    
    console.log(`Step 2: Updating Employee record for ${email}...`);
    const result = await Employee.updateOne(
        { 'personalDetails.email': { $regex: new RegExp("^" + email + "$", "i") } },
        { $set: { password: adminHashedPassword } }
    );
    
    if (result.matchedCount === 0) {
        console.error('ERROR: Could not find Employee record with this email.');
    } else if (result.modifiedCount === 0) {
        console.log('INFO: Employee password was already the same or record not modified.');
    } else {
        console.log('SUCCESS: Employee password updated to match Admin password.');
    }
    
    process.exit(0);
}

syncVaibhavPassword().catch(err => {
    console.error(err);
    process.exit(1);
});
