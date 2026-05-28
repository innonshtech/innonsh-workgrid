const fetch = require('node-fetch');

const DEPT_ID = "69a7f88ff20762990282e8b6"; // Software Development
const ORG_ID = "66f3e79f3b8d2e1f1a9d9c33"; // Example Org ID

async function testApi() {
    try {
        // Since I'm running this on the server side, I'll try to hit the URL directly if I can, or use the database.
        // But hitting the API is better.
        const url = `http://localhost:3000/api/crm/employeetype?departmentId=${DEPT_ID}`;
        console.log(`Fetching: ${url}`);
        
        const res = await fetch(url);
        const data = await res.json();
        
        console.log("API Response Status:", res.status);
        console.log("Returned designations:");
        if (data.data) {
            data.data.forEach(d => console.log(`- ${d.employeeType} (Dept: ${d.departmentId})`));
        } else {
            console.log("No data returned:", data);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testApi();
