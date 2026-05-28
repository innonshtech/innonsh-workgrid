const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: String
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

async function run() {
    try {
        await mongoose.connect(dbUrl);
        const count = await Attendance.countDocuments({ 
            date: { 
                $gte: new Date('2026-05-01'), 
                $lte: new Date('2026-05-11') 
            } 
        });
        console.log('Attendance records for May 1-11:', count);
        
        const countApril = await Attendance.countDocuments({
            date: {
                $gte: new Date('2026-04-01'),
                $lte: new Date('2026-04-30')
            }
        });
        console.log('Attendance records for April:', countApril);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
