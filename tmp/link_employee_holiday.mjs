import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Setup minimal schemas
const employeeSchema = new mongoose.Schema({
    email: String,
    role: String,
    jobDetails: {
        assignedOfficeId: mongoose.Schema.Types.ObjectId,
        organizationId: mongoose.Schema.Types.ObjectId,
    }
}, { strict: false });

const officeLocationSchema = new mongoose.Schema({
    name: String,
    organizationId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean
}, { strict: false });

const holidayListSchema = new mongoose.Schema({
    name: String,
    year: Number,
    organizationId: mongoose.Schema.Types.ObjectId,
    applicableLocations: [mongoose.Schema.Types.ObjectId],
    status: String
}, { strict: false });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema, 'employees');
const OfficeLocation = mongoose.models.OfficeLocation || mongoose.model('OfficeLocation', officeLocationSchema, 'officelocations');
const HolidayList = mongoose.models.HolidayList || mongoose.model('HolidayList', holidayListSchema, 'holidaylists');
const Organization = mongoose.models.Organization || mongoose.model('Organization', new mongoose.Schema({}, { strict: false }), 'organizations');

async function linkEmployeeToHolidays() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        // 1. Get an active organization
        const org = await Organization.findOne();
        if (!org) {
            console.log("No organization found. Cannot link.");
            return;
        }
        console.log(`Working in Org: ${org.name} (${org._id})`);

        // 2. See if we have an Office Location, if not, create one
        let office = await OfficeLocation.findOne({ organizationId: org._id });
        if (!office) {
            console.log("Creating default office location...");
            office = await OfficeLocation.create({
                name: "Main HQ",
                organizationId: org._id,
                isActive: true
            });
        }
        console.log(`Office Location: ${office.name} (${office._id})`);

        // 3. See if we have a Holiday List, if not, create one
        let holidayList = await HolidayList.findOne({ organizationId: org._id });
        if (!holidayList) {
            console.log("Creating default holiday list...");
            holidayList = await HolidayList.create({
                name: "Standard Holidays " + new Date().getFullYear(),
                year: new Date().getFullYear(),
                organizationId: org._id,
                applicableLocations: [office._id],
                status: 'Active',
                restrictedHolidayCount: 2
            });
        } else {
            // Guarantee the office location is in applicableLocations
            if (!holidayList.applicableLocations.includes(office._id)) {
                 holidayList.applicableLocations.push(office._id);
                 await holidayList.save();
                 console.log("Added office to holiday list applicable locations.");
            }
        }
        console.log(`Holiday List: ${holidayList.name} (${holidayList._id})`);

        // 4. Update all employees in the org
        const result = await Employee.updateMany(
            { "jobDetails.organizationId": org._id }, 
            { $set: { "jobDetails.assignedOfficeId": office._id } }
        );

        console.log("==========================================");
        console.log(`SUCCESS! Linked ALL active employees to test Holiday List.`);
        console.log(`Employees Updated: ${result.modifiedCount}`);
        console.log(`Office Linked: ${office.name}`);
        console.log(`Holiday List Associated: ${holidayList.name}`);
        console.log("==========================================");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

linkEmployeeToHolidays();
