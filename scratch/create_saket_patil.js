const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createEmployee() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
        
        // Hash password
        const hashedPassword = await bcrypt.hash('Saket@123', 10);

        const newEmployee = {
            employeeId: "EMP" + Math.floor(Math.random() * 10000),
            password: hashedPassword,
            role: "admin",
            status: "Active",
            personalDetails: {
                firstName: "Saket",
                lastName: "Patil",
                email: "saket.patil@test.com",
                phone: "9876543210",
                dateOfJoining: new Date().toISOString()
            },
            jobDetails: {
                organizationId: "69b8f205ccbf988b6f78c397", // Innonsh Technologies
                departmentId: "69b8f24eccbf988b6f78c3c1",   // Development
                designation: "Manager",
                workLocation: "Office"
            },
            salaryDetails: {
                bankAccount: {
                    accountNumber: "1234567890",
                    bankName: "HDFC Bank",
                    ifscCode: "HDFC0001234"
                },
                aadharNumber: "123412341234"
            }
        };

        const result = await Employee.create(newEmployee);
        console.log("✅ Employee 'Saket Patil' created successfully!");
        console.log("Employee ID:", result.employeeId);
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating employee:", error);
        process.exit(1);
    }
}

createEmployee();
