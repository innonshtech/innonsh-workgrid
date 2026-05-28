
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Create schema manually since we can't easily import ES modules in this script context without setup
// Copying relevant parts from Employee.js to ensure we test the mongoose behavior
const earningComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  editable: { type: Boolean, default: true },
  calculationType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  percentage: { type: Number, default: 0 },
  fixedAmount: { type: Number, default: 0 },
}, { _id: false });

const deductionComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  editable: { type: Boolean, default: true },
  calculationType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  percentage: { type: Number, default: 0 },
  fixedAmount: { type: Number, default: 0 },
}, { _id: false });

const employeePayslipStructureSchema = new mongoose.Schema({
  salaryType: { type: String, default: 'monthly' },
  basicSalary: { type: Number, required: true },
  earnings: [earningComponentSchema],
  deductions: [deductionComponentSchema],
  totalEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  personalDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfJoining: { type: Date, required: true },
  },
  jobDetails: {
    department: { type: String, required: true },
    designation: { type: String, required: true },
  },
  salaryDetails: {
    bankAccount: {
      accountNumber: String,
      bankName: String,
      ifscCode: String,
    }
  },
  payslipStructure: {
    type: employeePayslipStructureSchema,
    required: true,
  },
  workingHr: { type: Number, default: 9 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() }, 
}, { timestamps: true });

// Pre-save match
employeeSchema.pre('save', function (next) {
    // Mocking the updateComputedSalary logic
    let totalDeductions = 0;
    this.payslipStructure.deductions.forEach(d => {
        if (d.calculationType === 'fixed') {
            totalDeductions += d.fixedAmount;
        } else {
            totalDeductions += (this.payslipStructure.basicSalary * d.percentage / 100);
        }
    });
    this.payslipStructure.totalDeductions = totalDeductions;
    next();
});

const Employee = mongoose.models.EmployeeRepro || mongoose.model("EmployeeRepro", employeeSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const testId = "TEST_DED_" + Date.now();
    
    const newEmployee = new Employee({
      employeeId: testId,
      personalDetails: {
        firstName: "Test",
        lastName: "Deduction",
        email: `test_${testId}@example.com`,
        phone: "9999999999",
        dateOfJoining: new Date(),
      },
      jobDetails: {
        department: "IT",
        designation: "Tester",
      },
      salaryDetails: {
          bankAccount: {
              accountNumber: "123456789",
              bankName: "Test Bank",
              ifscCode: "TEST0001234"
          }
      },
      payslipStructure: {
        basicSalary: 10000,
        earnings: [],
        deductions: [
          {
            name: "Custom Fixed Deduction",
            enabled: true,
            editable: true,
            calculationType: "fixed",
            percentage: 0,
            fixedAmount: 500
          }
        ]
      }
    });

    console.log("Saving employee with fixedAmount: 500");
    await newEmployee.save();
    console.log("Saved.");

    const saved = await Employee.findOne({ employeeId: testId });
    console.log("Retrieved deduction:", saved.payslipStructure.deductions[0]);

    if (saved.payslipStructure.deductions[0].fixedAmount === 500) {
        console.log("SUCCESS: Fixed amount preserved.");
    } else {
        console.log("FAILURE: Fixed amount lost/changed.");
    }

    await Employee.deleteOne({ _id: saved._id });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
