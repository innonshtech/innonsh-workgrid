const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";
const ORG_ID = "69a6b3a371ed5d45088349c3";
const DEPT_QA = "69a7f88ff20762990282e8b7";
const DEPT_DEVOPS = "69a7f88ff20762990282e8b8";

async function seedData() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const Team = mongoose.model('Team', new mongoose.Schema({ 
            name: String, 
            departmentId: mongoose.Schema.Types.ObjectId,
            createdBy: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33") },
            status: { type: String, default: "Active" }
        }));
        
        const EmployeeType = mongoose.model('EmployeeType', new mongoose.Schema({ 
            employeeType: String, 
            organizationId: mongoose.Schema.Types.ObjectId, 
            departmentId: mongoose.Schema.Types.ObjectId,
            createdBy: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId("66e2f79f3b8d2e1f1a9d9c33") }
        }));

        // Seeding QA
        console.log("Seeding QA...");
        const qaTeams = ["Selenium", "Cypress"];
        for (const name of qaTeams) {
            await Team.updateOne({ name, departmentId: DEPT_QA }, { $set: { name, departmentId: DEPT_QA } }, { upsert: true });
        }
        
        const qaTypes = ["SDET", "Manual", "Automation"];
        for (const employeeType of qaTypes) {
            await EmployeeType.updateOne({ employeeType, departmentId: DEPT_QA }, { $set: { employeeType, departmentId: DEPT_QA, organizationId: ORG_ID } }, { upsert: true });
        }

        // Seeding DevOps
        console.log("Seeding DevOps...");
        const devopsTeams = ["AWS", "Azure"];
        for (const name of devopsTeams) {
            await Team.updateOne({ name, departmentId: DEPT_DEVOPS }, { $set: { name, departmentId: DEPT_DEVOPS } }, { upsert: true });
        }
        
        const devopsTypes = ["Cloud Engineer", "SRE", "DevOps"];
        for (const employeeType of devopsTypes) {
            await EmployeeType.updateOne({ employeeType, departmentId: DEPT_DEVOPS }, { $set: { employeeType, departmentId: DEPT_DEVOPS, organizationId: ORG_ID } }, { upsert: true });
        }

        console.log("Seeding completed successfully!");
        
    } catch (err) {
        console.error("Error seeding data:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seedData();
