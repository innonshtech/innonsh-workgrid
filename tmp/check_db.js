const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const Department = mongoose.model('Department', new mongoose.Schema({ departmentName: String }));
        const Team = mongoose.model('Team', new mongoose.Schema({ name: String, departmentId: mongoose.Schema.Types.ObjectId }));
        const EmployeeType = mongoose.model('EmployeeType', new mongoose.Schema({ employeeType: String, departmentId: mongoose.Schema.Types.ObjectId }));

        const departments = await Department.find();
        console.log("\n--- Departments ---");
        departments.forEach(d => console.log(`${d.departmentName} (ID: ${d._id})`));

        const teams = await Team.find();
        console.log("\n--- Teams ---");
        teams.forEach(t => console.log(`${t.name} (ID: ${t._id}, DeptID: ${t.departmentId})`));

        const employeeTypes = await EmployeeType.find();
        console.log("\n--- Employee Types ---");
        employeeTypes.forEach(e => console.log(`${e.employeeType} (ID: ${e._id}, DeptID: ${e.departmentId})`));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
