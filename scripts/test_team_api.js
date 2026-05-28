
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/hr-payroll?retryWrites=true&w=majority&appName=Cluster0";

async function testApi() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Team = mongoose.models.Team || mongoose.model('Team', new mongoose.Schema({ departmentId: mongoose.Schema.Types.ObjectId, name: String }));
        const Department = mongoose.models.Department || mongoose.model('Department', new mongoose.Schema({ departmentName: String, organizationId: mongoose.Schema.Types.ObjectId }));

        const dept = await Department.findOne({});
        if (!dept) {
            console.log("No departments found in DB");
            return;
        }
        console.log(`Testing with Department ID: ${dept._id} (${dept.departmentName})`);

        const teams = await Team.find({ departmentId: dept._id });
        console.log(`Found ${teams.length} teams for this department.`);
        if (teams.length > 0) {
            console.log("Teams:", teams.map(t => t.name).join(', '));
        } else {
            // Check if there are ANY teams at all
            const allTeams = await Team.find({});
            console.log(`Total teams in DB: ${allTeams.length}`);
            if (allTeams.length > 0) {
                console.log("First team's departmentId:", allTeams[0].departmentId);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

testApi();
