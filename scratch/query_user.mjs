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
        let targetId;
        try {
            targetId = new ObjectId(targetIdStr);
        } catch (e) {
            console.error("Invalid ObjectId format:", targetIdStr);
            return;
        }

        // Search Users
        const user = await db.collection("users").findOne({ _id: targetId });
        console.log("User query result:", user);

        if (user) {
            console.log("User role:", user.role);
            console.log("User employeeId:", user.employeeId);
        }

        // Search Employees
        const employee = await db.collection("employees").findOne({ _id: targetId });
        console.log("Employee query result by _id:", employee);

        if (!employee && user && user.employeeId) {
            const employeeByEmpId = await db.collection("employees").findOne({ employeeId: user.employeeId });
            console.log("Employee query result by user's employeeId:", employeeByEmpId);
        }

        // Search Employees by user reference if any
        const employeeByUserId = await db.collection("employees").findOne({ userId: targetId });
        console.log("Employee query result by userId field:", employeeByUserId);

        // Let's count total users and employees
        const totalUsers = await db.collection("users").countDocuments();
        const totalEmployees = await db.collection("employees").countDocuments();
        console.log(`Total users: ${totalUsers}, Total employees: ${totalEmployees}`);

    } finally {
        await client.close();
    }
}

run().catch(console.error);
