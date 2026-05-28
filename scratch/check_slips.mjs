import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        console.log("Connected to DB:", db.databaseName);

        const targetIdStr = "6a0ada041e242941169f9d70";
        const empId = new ObjectId(targetIdStr);

        const payslips = await db.collection("payslips").find({ employee: empId }).toArray();
        console.log(`Payslips count for ${targetIdStr}: ${payslips.length}`);
        if (payslips.length > 0) {
            console.log("First payslip sample:", JSON.stringify(payslips[0], null, 2));
        }

        const configs = await db.collection("payrollconfigs").find({}).toArray();
        console.log(`Total PayrollConfigs: ${configs.length}`);
        configs.forEach(c => {
            console.log(`- Org: ${c.company}, PaymentDay: ${c.paymentDay}`);
        });

    } finally {
        await client.close();
    }
}

run().catch(console.error);
