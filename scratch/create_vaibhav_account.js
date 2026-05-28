const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createVaibhav() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const employees = db.collection('employees');
        const users = db.collection('users');
        
        const orgId = new mongoose.Types.ObjectId("69b8f205ccbf988b6f78c397");
        const deptId = new mongoose.Types.ObjectId("69b8f24eccbf988b6f78c3c1");
        const empId = "EMP1562";
        const email = "vaibhav.innonsh@gmail.com";
        const password = "Innonsh@100";
        const hashedPassword = await bcrypt.hash(password, 12);

        // 1. Create Employee Record
        const newEmployee = {
            employeeId: empId,
            role: 'admin',
            status: 'Active',
            personalDetails: {
                firstName: 'Vaibhav',
                lastName: 'Thorat',
                email: email,
                phone: '9876543211',
                dateOfJoining: new Date()
            },
            jobDetails: {
                organizationId: orgId,
                organization: 'Innonsh Technologies',
                departmentId: deptId,
                department: 'Development',
                designation: 'Admin & Employee',
                workLocation: 'Office'
            },
            salaryDetails: {
                bankAccount: {
                    accountNumber: '1122334455',
                    bankName: 'HDFC Bank',
                    ifscCode: 'HDFC0001234'
                }
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        };

        const empResult = await employees.insertOne(newEmployee);
        console.log('Employee record created:', empResult.insertedId);

        // 2. Create User Account
        const newUser = {
            name: 'Vaibhav Thorat',
            email: email,
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            organizationId: orgId,
            companyName: 'Innonsh Technologies',
            employeeId: empId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const userResult = await users.insertOne(newUser);
        console.log('User login account created:', userResult.insertedId);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createVaibhav();
