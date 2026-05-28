
const mongoose = require('mongoose');

// MONGODB_URI from .env.local
const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const Organization = mongoose.models.Organization || mongoose.model('Organization', new mongoose.Schema({ name: String }));
        const BusinessUnit = mongoose.models.BusinessUnit || mongoose.model('BusinessUnit', new mongoose.Schema({ name: String, organizationId: mongoose.Schema.Types.ObjectId }));
        const Team = mongoose.models.Team || mongoose.model('Team', new mongoose.Schema({ departmentId: mongoose.Schema.Types.ObjectId, name: String }));
        const EmployeeType = mongoose.models.EmployeeType || mongoose.model('EmployeeType', new mongoose.Schema({ organizationId: mongoose.Schema.Types.ObjectId, departmentId: mongoose.Schema.Types.ObjectId, employeeType: String }));
        const Department = mongoose.models.Department || mongoose.model('Department', new mongoose.Schema({ departmentName: String, businessUnitId: mongoose.Schema.Types.ObjectId, organizationId: mongoose.Schema.Types.ObjectId }));

        const allOrgs = await Organization.find({});
        console.log(`Total Organizations: ${allOrgs.length}`);
        if (allOrgs.length > 0) {
            allOrgs.forEach(org => {
                console.log(`Organization: id=${org._id}, name="${org.name}"`);
            });
        }

        const allBUs = await BusinessUnit.find({});
        console.log(`Total Business Units: ${allBUs.length}`);
        if (allBUs.length > 0) {
            console.log("First Business Unit:", JSON.stringify({ id: allBUs[0]._id, name: allBUs[0].name, organizationId: allBUs[0].organizationId }, null, 2));
        }

        const allTeams = await Team.find({});
        console.log(`Total Teams: ${allTeams.length}`);
        if (allTeams.length > 0) {
            console.log("First Team:", JSON.stringify(allTeams[0], null, 2));
        }

        const allTypes = await EmployeeType.find({});
        console.log(`Total Employee Types: ${allTypes.length}`);
        if (allTypes.length > 0) {
            console.log("First Type:", JSON.stringify(allTypes[0], null, 2));
        }

        const allDepts = await Department.find({});
        console.log(`Total Departments: ${allDepts.length}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkData();
