
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StatutoryConfig from '@/lib/db/models/payroll/StatutoryConfig';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';

export async function GET() {
    try {
        await dbConnect();

        // 1. Create Karnataka Config
        await StatutoryConfig.deleteMany({ state: 'Karnataka-Test' });

        await StatutoryConfig.create({
            state: 'Karnataka-Test',
            ptApplicable: true,
            ptSlabs: [
                { minSalary: 0, maxSalary: 15000, taxAmount: 0 },
                { minSalary: 15001, maxSalary: 1000000, taxAmount: 200 } // Higher slab
            ]
        });

        // 2. Create/Find User
        let user = await User.findOne({ email: 'admin@test.com' });
        if (!user) {
            user = await User.findOne({});
        }

        // 3. Create Employee
        const email = `test-karnataka-v2-${Date.now()}@example.com`;

        const empData = {
            employeeId: `EMP-V2-${Date.now()}`,
            workingHr: 9,
            personalDetails: {
                firstName: 'Karnataka',
                lastName: 'Tester',
                email: email,
                phone: '9999999999',
                dateOfBirth: new Date('1990-01-01'),
                dateOfJoining: new Date(),
                currentAddress: {
                    street: 'Test St', city: 'Bangalore', state: 'Karnataka', zipCode: '560001'
                },
                permanentAddress: {
                    street: 'Test St', city: 'Bangalore', state: 'Karnataka', zipCode: '560001'
                }
            },
            jobDetails: {
                designation: 'Software Engineer',
                workState: 'Karnataka-Test', // Usage of our new config
                department: 'Engineering',
            },
            salaryDetails: {
                bankAccount: { accountNumber: '1234567890', bankName: 'Test Bank', ifscCode: 'TEST0000001' }
            },
            payslipStructure: {
                salaryType: 'monthly',
                basicSalary: 20000, // Should trigger 200 PT
                earnings: [],
                deductions: [],
            },
            password: 'password123',
            createdBy: user ? user._id : undefined
        };

        const employee = new Employee(empData);
        await employee.save(); // This triggers pre-save hook -> fetches config -> calculates PT

        // 4. Verify
        const ptDeduction = employee.payslipStructure.deductions.find(d => d.name === 'Professional Tax (PT)');
        let result = {};

        if (ptDeduction && ptDeduction.calculatedAmount === 200) {
            result = {
                status: 'SUCCESS',
                message: 'Karnataka PT calculated correctly (200)',
                pt: ptDeduction.calculatedAmount
            };
        } else {
            result = {
                status: 'FAILURE',
                message: `Expected 200, got ${ptDeduction ? ptDeduction.calculatedAmount : 'None'}`,
                pt: ptDeduction
            };
        }

        // Cleanup
        await StatutoryConfig.deleteMany({ state: 'Karnataka-Test' });
        await Employee.deleteOne({ _id: employee._id });

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 200 });
    }
}
