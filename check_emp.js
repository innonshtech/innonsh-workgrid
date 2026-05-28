
const mongoose = require('mongoose');
const dbConnect = require('./src/lib/db/connect').default;
const Employee = require('./src/lib/db/models/payroll/Employee').default;
const WorkingShift = require('./src/lib/db/models/payroll/WorkingShift').default;

async function checkEmployee() {
    try {
        await dbConnect();
        const employee = await Employee.findOne({ employeeId: 'EMP001' }).populate('jobDetails.defaultShift');
        if (employee) {
            console.log('Employee Found:', employee.personalDetails.firstName, employee.personalDetails.lastName);
            console.log('Job Details Default Shift ID:', employee.jobDetails.defaultShift?._id || employee.jobDetails.defaultShift);
            if (employee.jobDetails.defaultShift) {
                console.log('Default Shift Assigned:', JSON.stringify(employee.jobDetails.defaultShift, null, 2));
            } else {
                console.log('No Default Shift Assigned.');
            }
        } else {
            console.log('Employee EMP001 not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkEmployee();
