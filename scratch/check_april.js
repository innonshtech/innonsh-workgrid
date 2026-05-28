const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  date: { type: Date },
  status: String
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

async function run() {
    try {
        await mongoose.connect(dbUrl);
        const firstRec = await Attendance.findOne({});
        if (!firstRec) {
            console.log('No records found');
            return;
        }
        console.log('First record:', JSON.stringify(firstRec, null, 2));
        
        const empId = firstRec.employee;
        console.log('Checking records for Employee ID:', empId);
        
        const records = await Attendance.find({ 
            employee: empId, 
            date: { 
                $gte: new Date('2026-04-01'), 
                $lte: new Date('2026-04-30') 
            } 
        }).sort({ date: 1 });
        
        console.log('Count for April:', records.length);
        records.forEach(r => {
            console.log(r.date.toISOString().split('T')[0], r.status);
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
