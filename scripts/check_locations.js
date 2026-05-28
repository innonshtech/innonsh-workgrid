
const mongoose = require('mongoose');

// Adjust the URI if needed, but usually it's in .env.local
// I'll assume a standard local connection string for now or try to read it.
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hr-payroll-system";

const officeLocationSchema = new mongoose.Schema({
    name: String,
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
}, { strict: false });

const OfficeLocation = mongoose.model('OfficeLocation', officeLocationSchema);

async function checkLocations() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const locations = await OfficeLocation.find({});
        console.log(`Found ${locations.length} office locations.`);
        console.log(JSON.stringify(locations, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkLocations();
