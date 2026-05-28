const mongoose = require('mongoose');
require('dotenv').config();

async function fixSequences() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const employees = db.collection('employees');
        const users = db.collection('users');
        
        // Get all employees sorted by creation date
        const allEmps = await employees.find({}).sort({ createdAt: 1 }).toArray();
        
        console.log(`Found ${allEmps.length} employees to fix.`);

        for (let i = 0; i < allEmps.length; i++) {
            const oldId = allEmps[i].employeeId;
            const newId = `EMP${String(i + 1).padStart(3, '0')}`; // EMP001, EMP002, etc.
            
            console.log(`Updating ${allEmps[i].personalDetails.firstName}: ${oldId} -> ${newId}`);

            // Update Employee record
            await employees.updateOne(
                { _id: allEmps[i]._id },
                { $set: { employeeId: newId } }
            );

            // Update corresponding User record if exists
            await users.updateOne(
                { employeeId: oldId },
                { $set: { employeeId: newId } }
            );
        }
        
        console.log('All IDs updated to proper sequence.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixSequences();
