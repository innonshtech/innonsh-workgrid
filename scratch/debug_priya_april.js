const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function run() {
    try {
        await mongoose.connect(dbUrl);
        const col = mongoose.connection.db.collection('attendances');
        
        // EMP006: Priya Verma
        const empId = new mongoose.Types.ObjectId('69fc3bb44ce64c40f6a2ebc2');
        
        const recs = await col.find({ 
            employee: empId,
            date: { 
                $gte: new Date('2026-04-01T00:00:00Z'), 
                $lte: new Date('2026-04-15T23:59:59Z') 
            } 
        }).sort({ date: 1 }).toArray();
        
        console.log('Found records for April 1-15:', recs.length);
        recs.forEach(r => console.log(r.date.toISOString(), r.status));
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
