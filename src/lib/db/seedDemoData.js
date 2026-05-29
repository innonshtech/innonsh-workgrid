import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Access/Register all models to ensure schemas are populated.
import '@/lib/db/models/crm/organization/Organization';
import '@/lib/db/models/crm/organization/BusinessUnit';
import '@/lib/db/models/crm/organization/Team';
import '@/lib/db/models/crm/Department/department';
import '@/lib/db/models/crm/employee/EmployeeType';
import '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';

export async function seedDemoSandbox(organizationId, userId, companyName, adminEmail, adminPhone) {
  console.log(`🌱 Starting sandbox data seeding for Organization: ${companyName} (${organizationId})`);
  
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const BusinessUnit = mongoose.models.BusinessUnit;
  const Department = mongoose.models.Department;
  const Team = mongoose.models.Team;
  const EmployeeType = mongoose.models.EmployeeType;
  const Employee = mongoose.models.Employee;

  try {
    // 1. Create Business Units
    console.log('  Creating Business Units...');
    const buEngineering = await BusinessUnit.create({
      name: 'Product & Engineering',
      organizationId: orgObjectId,
      description: 'Core product engineering and development',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    const buOperations = await BusinessUnit.create({
      name: 'Operations & Sourcing',
      organizationId: orgObjectId,
      description: 'Talent operations, staffing, and recruiting',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    // 2. Create Departments
    console.log('  Creating Departments...');
    const deptEngineering = await Department.create({
      organizationId: orgObjectId,
      businessUnitId: buEngineering._id,
      departmentName: 'Software Engineering',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    const deptTalent = await Department.create({
      organizationId: orgObjectId,
      businessUnitId: buOperations._id,
      departmentName: 'Talent Acquisition & Staffing',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    // 3. Create Teams
    console.log('  Creating Teams...');
    const teamReact = await Team.create({
      name: 'React Platform Squad',
      departmentId: deptEngineering._id,
      description: 'Web Application Development',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    const teamStaffing = await Team.create({
      name: 'Sourcing & Staff Augmentation',
      departmentId: deptTalent._id,
      description: 'Staff augmentation and client deliveries',
      status: 'Active',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    // 4. Create Employee Types
    console.log('  Creating Employee Types...');
    const typeFullTime = await EmployeeType.create({
      organizationId: orgObjectId,
      departmentId: deptEngineering._id,
      employeeType: 'Full-Time Employee',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    const typeContractor = await EmployeeType.create({
      organizationId: orgObjectId,
      departmentId: deptTalent._id,
      employeeType: 'Contract Consultant',
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });

    // Hash default passwords for dummy employees
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('emp123', salt);

    // 5. Create Dummy Employees
    console.log('  Creating Trial Employees...');
    const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'trial';
    
    // a. Sarah Jenkins - HR Operations Manager & Supervisor
    const empSarah = await Employee.create({
      employeeId: 'EMP-TRIAL-001',
      password: hashedPassword,
      role: 'employee',
      isCompliant: true,
      personalDetails: {
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: `sarah.jenkins@${domain}.com`,
        phone: '9876543210',
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-05-15'),
        gender: 'Female',
      },
      jobDetails: {
        department: 'Talent Acquisition & Staffing',
        departmentId: deptTalent._id,
        employeeType: 'Full-Time Employee',
        employeeTypeId: typeFullTime._id,
        organization: companyName,
        organizationId: orgObjectId,
        businessUnitId: buOperations._id,
        teamId: teamStaffing._id,
        designation: 'Operations & Delivery Manager',
        workLocation: 'Remote',
      },
      salaryDetails: {
        bankAccount: {
          accountNumber: '123456789012',
          bankName: 'HDFC Bank',
          ifscCode: 'HDFC0001234',
          branch: 'Main Branch',
        },
        panNumber: 'ABCDE1234F',
        aadharNumber: '123456789012',
      },
      payslipStructure: {
        salaryType: 'monthly',
        basicSalary: 75000,
        earnings: [
          { name: 'House Rent Allowance', enabled: true, editable: true, calculationType: 'percentage', percentage: 40, fixedAmount: 0 },
          { name: 'Special Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 15000 },
        ],
        deductions: [
          { name: 'Professional Tax', enabled: true, editable: false, calculationType: 'fixed', percentage: 0, fixedAmount: 200 },
        ],
        totalEarnings: 105000,
        totalDeductions: 200,
        netSalary: 104800,
        grossSalary: 105000,
      },
      status: 'Active',
      createdBy: userObjectId,
    });

    // b. David Miller - Recruiter (with restricted role 'recruiter')
    const empDavid = await Employee.create({
      employeeId: 'EMP-TRIAL-002',
      password: hashedPassword,
      role: 'recruiter', // Dedicated recruiter role
      isCompliant: true,
      personalDetails: {
        firstName: 'David',
        lastName: 'Miller',
        email: `david.recruiter@${domain}.com`,
        phone: '9876543211',
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1994-08-22'),
        gender: 'Male',
      },
      jobDetails: {
        department: 'Talent Acquisition & Staffing',
        departmentId: deptTalent._id,
        employeeType: 'Full-Time Employee',
        employeeTypeId: typeFullTime._id,
        organization: companyName,
        organizationId: orgObjectId,
        businessUnitId: buOperations._id,
        teamId: teamStaffing._id,
        designation: 'Senior Recruiter',
        reportingManager: empSarah._id,
        workLocation: 'Hybrid',
      },
      salaryDetails: {
        bankAccount: {
          accountNumber: '987654321098',
          bankName: 'ICICI Bank',
          ifscCode: 'ICIC0005678',
          branch: 'City Center',
        },
        panNumber: 'FGHIJ5678K',
        aadharNumber: '987654321098',
      },
      payslipStructure: {
        salaryType: 'monthly',
        basicSalary: 45000,
        earnings: [
          { name: 'House Rent Allowance', enabled: true, editable: true, calculationType: 'percentage', percentage: 40, fixedAmount: 0 },
          { name: 'Special Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 8000 },
        ],
        deductions: [
          { name: 'Professional Tax', enabled: true, editable: false, calculationType: 'fixed', percentage: 0, fixedAmount: 200 },
        ],
        totalEarnings: 61000,
        totalDeductions: 200,
        netSalary: 60800,
        grossSalary: 61000,
      },
      status: 'Active',
      createdBy: userObjectId,
    });

    // c. Alex Wong - Software Developer (Regular Employee)
    await Employee.create({
      employeeId: 'EMP-TRIAL-003',
      password: hashedPassword,
      role: 'employee',
      isCompliant: true,
      personalDetails: {
        firstName: 'Alex',
        lastName: 'Wong',
        email: `alex.wong@${domain}.com`,
        phone: '9876543212',
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1996-12-05'),
        gender: 'Male',
      },
      jobDetails: {
        department: 'Software Engineering',
        departmentId: deptEngineering._id,
        employeeType: 'Full-Time Employee',
        employeeTypeId: typeFullTime._id,
        organization: companyName,
        organizationId: orgObjectId,
        businessUnitId: buEngineering._id,
        teamId: teamReact._id,
        designation: 'Frontend Engineer',
        reportingManager: empSarah._id,
        workLocation: 'Office',
      },
      salaryDetails: {
        bankAccount: {
          accountNumber: '111222333444',
          bankName: 'State Bank of India',
          ifscCode: 'SBIN0009999',
          branch: 'Technology Park',
        },
        panNumber: 'LMNOP9999Z',
        aadharNumber: '111222333444',
      },
      payslipStructure: {
        salaryType: 'monthly',
        basicSalary: 50000,
        earnings: [
          { name: 'House Rent Allowance', enabled: true, editable: true, calculationType: 'percentage', percentage: 40, fixedAmount: 0 },
          { name: 'Special Allowance', enabled: true, editable: true, calculationType: 'fixed', percentage: 0, fixedAmount: 10000 },
        ],
        deductions: [
          { name: 'Professional Tax', enabled: true, editable: false, calculationType: 'fixed', percentage: 0, fixedAmount: 200 },
        ],
        totalEarnings: 70000,
        totalDeductions: 200,
        netSalary: 69800,
        grossSalary: 70000,
      },
      status: 'Active',
      createdBy: userObjectId,
    });

    console.log(`✅ Sandbox data seeded successfully for organization: ${organizationId}`);
    return true;
  } catch (error) {
    console.error('💥 Error seeding sandbox demo data:', error);
    throw error;
  }
}
