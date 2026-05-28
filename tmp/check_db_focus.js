const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI);

        const Department = mongoose.model('Department', new mongoose.Schema({ departmentName: String }));
        const Team = mongoose.model('Team', new mongoose.Schema({ name: String, departmentId: mongoose.Schema.Types.ObjectId }));
        const EmployeeType = mongoose.model('EmployeeType', new mongoose.Schema({ employeeType: String, departmentId: mongoose.Schema.Types.ObjectId }));

        const nextjsTeams = await Team.find({ name: /Next\.js/i });
        console.log("--- Next.js Teams ---");
        for (const t of nextjsTeams) {
            const dept = await Department.findById(t.departmentId);
            console.log(`Team: ${t.name}, Dept: ${dept?.departmentName} (${t.departmentId})`);

            const types = await EmployeeType.find({ departmentId: t.departmentId });
            console.log(`  Designations in this Dept: ${types.map(e => e.employeeType).join(', ')}`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
