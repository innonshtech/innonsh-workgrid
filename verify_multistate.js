
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { join } = require('path');

// Load env vars
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(process.cwd(), '.env.local') });

const dbConnect = async () => {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
};

async function verify() {
    await dbConnect();
    console.log('Connected to DB');

    try {
        // 1. Create Karnataka Config
        const StatutoryConfig = require('./src/lib/db/models/payroll/StatutoryConfig').default;
        await StatutoryConfig.deleteMany({ state: 'Karnataka-Test' });

        await StatutoryConfig.create({
            state: 'Karnataka-Test',
            ptApplicable: true,
            ptSlabs: [
                { minSalary: 0, maxSalary: 15000, taxAmount: 0 },
                { minSalary: 15001, maxSalary: 1000000, taxAmount: 200 } // Higher slab
            ]
        });
        console.log('Created Karnataka-Test config');

        // 2. Create Employee
        const Employee = require('./src/lib/db/models/payroll/Employee').default;
        const User = require('./src/lib/db/models/User').default;

        // Find or create a user for createdBy
        let user = await User.findOne({ email: 'admin@test.com' });
        if (!user) {
            user = await User.create({
                name: 'Test Admin',
                email: 'admin@test.com',
                password: 'password123',
                role: 'admin'
            });
        }

        // Cleanup existing test employee
        await Employee.deleteMany({ 'personalDetails.email': 'test-karnataka@example.com' });

        const empData = {
            personalDetails: {
                firstName: 'Karnataka',
                lastName: 'Tester',
                email: 'test-karnataka@example.com',
                phone: '9999999999',
                dateOfBirth: new Date('1990-01-01'),
            },
            jobDetails: {
                designation: 'Software Engineer',
                workState: 'Karnataka-Test', // Usage of our new config
            },
            salaryDetails: {
                bankAccount: { accountNumber: '123', bankName: 'Test', ifscCode: 'IFSC' }
            },
            payslipStructure: {
                salaryType: 'monthly',
                basicSalary: 20000, // Should trigger 200 PT
                earnings: [],
                deductions: [],
            },
            password: 'password123',
            createdBy: user._id
        };

        console.log('Creating employee...');
        const employee = new Employee(empData);
        await employee.save();

        console.log('Employee created. Checking calculated deductions...');

        // Check Deductions
        const ptDeduction = employee.payslipStructure.deductions.find(d => d.name === 'Professional Tax (PT)');

        if (ptDeduction) {
            console.log(`PT Deduction: ${ptDeduction.calculatedAmount}`);
            if (ptDeduction.calculatedAmount === 200) {
                console.log('SUCCESS: Karnataka PT calculated correctly (200)');
            } else {
                console.error(`FAILURE: Expected 200, got ${ptDeduction.calculatedAmount}`);
            }
        } else {
            console.error('FAILURE: PT Deduction not found!');
        }

        // cleanup
        await StatutoryConfig.deleteMany({ state: 'Karnataka-Test' });
        await Employee.deleteMany({ 'personalDetails.email': 'test-karnataka@example.com' });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
