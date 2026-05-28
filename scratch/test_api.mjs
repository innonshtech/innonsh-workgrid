import { SignJWT } from 'jose';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // or use global fetch
dotenv.config();

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function run() {
    const payload = {
        id: "6a0ada041e242941169f9d70",
        role: "employee",
        organizationId: "6a0444985322ad791296f805"
    };

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .sign(secret);

    console.log("Generated token:", token);

    const urls = [
        "http://localhost:3000/api/v1/employee/payroll/employees",
        "http://localhost:3000/api/v1/employee/payroll/employees/6a0ada041e242941169f9d70",
        "http://localhost:3000/api/v1/admin/employees/6a0ada041e242941169f9d70"
    ];

    for (const url of urls) {
        console.log("\n-------------------------------------------");
        console.log("Fetching url:", url);

        try {
            const res = await fetch(url, {
                headers: {
                    "Cookie": `employee_token=${token}`
                }
            });

            console.log("Response Status:", res.status);
            console.log("Response Headers:", Object.fromEntries(res.headers.entries()));
            
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const json = await res.json();
                console.log("Response Body (JSON):", JSON.stringify(json, null, 2));
            } else {
                const text = await res.text();
                console.log("Response Body (Text):", text.slice(0, 1000));
            }
        } catch (e) {
            console.error("Fetch failed:", e);
        }
    }
}

run();
