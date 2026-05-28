const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function run() {
    try {
        await mongoose.connect(dbUrl);
        const countApril = await mongoose.connection.db.collection('attendances').countDocuments({ 
            date: { 
                $gte: new Date('2026-04-01'), 
                $lte: new Date('2026-04-30T23:59:59.999Z') 
            } 
        });
        console.log('April records count:', countApril);
        
        const employees = await mongoose.connection.db.collection('employees').countDocuments({ status: 'Active' });
        console.log('Active employees:', employees);
        
        console.log('Expected count (30 days * active employees):', 30 * employees);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
