const mongoose = require('mongoose');
require('dotenv').config();

async function update() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await mongoose.connection.db.collection('employees').updateOne(
            { 'personalDetails.firstName': 'Saket' },
            { 
                $set: { 
                    'jobDetails.organization': 'Innonsh Technologies',
                    'jobDetails.department': 'Development',
                    'jobDetails.designation': 'Manager'
                } 
            }
        );
        console.log('Successfully updated Saket record:', result.modifiedCount);
        process.exit(0);
    } catch (error) {
        console.error('Error updating:', error);
        process.exit(1);
    }
}
update();
