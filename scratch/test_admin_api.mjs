import { SignJWT } from 'jose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function run() {
    // Generate admin token
    const adminPayload = {
        id: "6a0444076c76d863008f0660", // some admin ID
        role: "admin",
        organizationId: "6a0444985322ad791296f805"
    };

    const adminToken = await new SignJWT(adminPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .sign(secret);

    // Generate employee token
    const employeePayload = {
        id: "6a0ada041e242941169f9d70",
        role: "employee",
        organizationId: "6a0444985322ad791296f805"
    };

    const employeeToken = await new SignJWT(employeePayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .sign(secret);

    console.log("Admin token:", adminToken);
    console.log("Employee token:", employeeToken);

    const requests = [
        {
            url: "http://localhost:3000/api/v1/admin/payroll/employees/6a0ada041e242941169f9d70",
            token: adminToken,
            cookieName: "authToken",
            label: "Admin accessing Admin Payroll Employee [id]"
        },
        {
            url: "http://localhost:3000/api/v1/employee/payroll/employees/6a0ada041e242941169f9d70",
            token: employeeToken,
            cookieName: "employee_token",
            label: "Employee accessing Employee Payroll Employee [id]"
        }
    ];

    for (const reqInfo of requests) {
        console.log("\n-------------------------------------------");
        console.log("Test:", reqInfo.label);
        console.log("Fetching URL:", reqInfo.url);

        try {
            const res = await fetch(reqInfo.url, {
                headers: {
                    "Cookie": `${reqInfo.cookieName}=${reqInfo.token}`
                }
            });

            console.log("Response Status:", res.status);
            const contentType = res.headers.get("content-type");
            console.log("Content-Type:", contentType);
            
            if (contentType && contentType.includes("application/json")) {
                const json = await res.json();
                console.log("Response JSON:", JSON.stringify(json, null, 2));
            } else {
                const text = await res.text();
                console.log("Response Text (first 300 chars):", text.slice(0, 300));
            }
        } catch (e) {
            console.error("Request failed:", e);
        }
    }
}

run();
