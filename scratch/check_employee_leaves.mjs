import dbConnect from '../src/lib/db/connect.js';
import Employee from '../src/lib/models/Employee.js';

async function checkLeaves() {
    await dbConnect();
    const employee = await Employee.findOne().lean();
    console.log(JSON.stringify(employee.leaveBalances || employee.leaves || {}, null, 2));
    process.exit(0);
}

checkLeaves();
