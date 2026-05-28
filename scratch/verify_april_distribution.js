const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function run() {
    try {
        await mongoose.connect(dbUrl);
        const col = mongoose.connection.db.collection('attendances');
        
        const totalApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') } 
        });
        const presentApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') },
            status: 'Present'
        });
        const weekendApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') },
            status: 'Weekend'
        });
        const absentApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') },
            status: 'Absent'
        });
        const leaveApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') },
            status: 'Leave'
        });
        const halfDayApril = await col.countDocuments({ 
            date: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30T23:59:59Z') },
            status: 'Half-day'
        });
        
        console.log('April Total Daily Records:', totalApril);
        console.log('April Present:', presentApril);
        console.log('April Weekend:', weekendApril);
        console.log('April Absent:', absentApril);
        console.log('April Leave:', leaveApril);
        console.log('April Half-day:', halfDayApril);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
