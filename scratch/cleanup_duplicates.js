const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function cleanup() {
    try {
        await mongoose.connect(dbUrl);
        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
        const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
        
        const idsToDelete = ['69e747304bae862064bfae5c', '69e75cd97c043f648c9143a5'];
        
        const resEmp = await Employee.deleteMany({ _id: { $in: idsToDelete.map(id => new mongoose.Types.ObjectId(id)) } });
        const resExp = await Expense.deleteMany({ employee: { $in: idsToDelete.map(id => new mongoose.Types.ObjectId(id)) } });
        
        console.log('Deleted Employees:', resEmp.deletedCount);
        console.log('Deleted associated Expenses:', resExp.deletedCount);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanup();
