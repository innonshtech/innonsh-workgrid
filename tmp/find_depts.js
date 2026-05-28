const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";

async function findIds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Department = mongoose.model('Department', new mongoose.Schema({ departmentName: String, organizationId: mongoose.Schema.Types.ObjectId }));
        
        const depts = await Department.find({ departmentName: { $in: ["DevOps", "QA"] } });
        console.log("Departments found:");
        depts.forEach(d => console.log(`${d.departmentName}: ${d._id} (Org: ${d.organizationId})`));
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

findIds();
