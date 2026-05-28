
const API_URL = 'http://localhost:3000/api/settings/office-locations';
const TEST_ID = "6998024334deafef05720a8d"; // ID from previous output

async function deleteTestLocation() {
    try {
        console.log(`Deleting test location ${TEST_ID}...`);
        const response = await fetch(`${API_URL}?id=${TEST_ID}`, {
            method: 'DELETE',
        });

        const data = await response.json();
        console.log("Delete Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

deleteTestLocation();
