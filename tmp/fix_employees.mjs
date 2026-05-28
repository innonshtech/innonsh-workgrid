import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const employeeSchema = new mongoose.Schema({
  employeeId: String,
  status: String,
  payslipStructure: Object
}, { strict: false });

async function run() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("No Mongo URI");
    await mongoose.connect(process.env.MONGODB_URI);
    const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
    const employees = await Employee.find({ status: "Active" });
    let count = 0;
    for (const emp of employees) {
      if (!emp.payslipStructure || !emp.payslipStructure.basicSalary) {
        const payslipStructure = emp.payslipStructure || {};
        payslipStructure.basicSalary = 50000;
        payslipStructure.salaryType = 'monthly';
        await Employee.updateOne({ _id: emp._id }, { $set: { payslipStructure } });
        count++;
      }
    }
    console.log(`Updated ${count} employees missing basicSalary`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
