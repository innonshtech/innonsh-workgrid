import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://gaikwadsameer422_db_user:vYkPEmN1wMSaEKd9@cluster0.fqf0bni.mongodb.net/?appName=Cluster0";

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("test"); // Or whatever default DB name next uses, might need to list databases
        // Let's list databases first and then collections
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        console.log("Databases:", dbs.databases.map(d => d.name));

        // Try finding the employees collection in a likely database (maybe "test" or "hr-payroll")
        // Mongoose usually connects to "test" by default if not specified in URI
        const collections = await client.db("test").listCollections().toArray();
        console.log("Collections in 'test':", collections.map(c => c.name));

        const employees = await client.db("test").collection("employees").find({}).toArray();
        console.log(`Found ${employees.length} employees in 'test'.`);
        employees.forEach(e => console.log(e.employeeId, e.personalDetails?.firstName));

    } finally {
        await client.close();
    }
}

run().catch(console.error);
