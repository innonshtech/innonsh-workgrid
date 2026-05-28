const mongoose = require('mongoose');
const dbUrl = 'mongodb+srv://xpertance:XPERTANCE@cluster0.dnv2io.mongodb.net/hr_payroll';

async function testQuery() {
    try {
        await mongoose.connect(dbUrl);
        const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
        
        const employeeId = '69b91b7cccbf988b6f78c83e'; // Aniket Patil EMP-001
        
        console.log('Testing query for employeeId:', employeeId);
        
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            console.log('Employee NOT FOUND in DB!');
            process.exit(1);
        }
        
        const deptName = employee.jobDetails?.department;
        const teamName = employee.jobDetails?.teamId?.name; // Note: teamId is not populated here in scratch
        
        console.log('Employee details:', { 
            name: `${employee.personalDetails?.firstName} ${employee.personalDetails?.lastName}`,
            dept: deptName,
            team: teamName
        });

        // Exact query from API
        const visibilityFilter = {
            $or: [
                { employee: new mongoose.Types.ObjectId(employeeId) }
            ]
        };
        // We'll skip team/dept for now just to see if personal matches
        
        const query = { $and: [visibilityFilter] };
        
        console.log('Running query:', JSON.stringify(query, null, 2));
        
        const expenses = await Expense.find(query).lean();
        console.log('Found expenses:', expenses.length);
        if (expenses.length > 0) {
            console.log('Sample expense:', JSON.stringify(expenses[0], null, 2));
        } else {
            // Check all expenses for this employee without $and/$or
            const allForEmp = await Expense.find({ employee: new mongoose.Types.ObjectId(employeeId) }).lean();
            console.log('Total expenses for this employee (direct find):', allForEmp.length);
            
            if (allForEmp.length === 0) {
                // Check if employee is stored as string
                const asString = await Expense.find({ employee: employeeId }).lean();
                console.log('Total expenses for this employee (string match):', asString.length);
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testQuery();
