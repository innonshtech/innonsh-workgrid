import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const empId = new ObjectId("6a0ada041e242941169f9d70");

        const payslips = await db.collection("payslips").find({ employee: empId }).toArray();
        console.log("Payslips for employee 6a0ada041e242941169f9d70:", payslips);

        // Let's print unique status count
        const allPayslips = await db.collection("payslips").find({}).toArray();
        console.log("Total payslips in database:", allPayslips.length);
        console.log("Unique statuses and employees in all payslips:");
        const uniqueInfo = allPayslips.map(p => ({
            employee: p.employee.toString(),
            month: p.month,
            year: p.year,
            status: p.status,
            netSalary: p.netSalary
        }));
        console.log(uniqueInfo);

    } finally {
        await client.close();
    }
}

run().catch(console.error);
