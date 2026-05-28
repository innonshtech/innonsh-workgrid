
const API_URL = 'http://localhost:3000/api/settings/office-locations';

async function testCreateLocation() {
    try {
        const dummyLocation = {
            name: "Test HQ",
            organizationId: "66e2f79f3b8d2e1f1a9d9c33", // Using a dummy ID for testing
            address: {
                street: "123 Test St",
                city: "Test City",
                state: "Test State",
                zipCode: "12345",
                country: "Test Country"
            },
            coordinates: {
                latitude: 12.9716,
                longitude: 77.5946
            },
            radius: 100
        };

        console.log("Creating test location...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dummyLocation)
        });

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            console.log("Create Response:", JSON.stringify(data, null, 2));

            if (data.success) {
                console.log("Fetching locations...");
                const fetchResponse = await fetch(`${API_URL}?organizationId=66e2f79f3b8d2e1f1a9d9c33`);
                const fetchData = await fetchResponse.json();
                console.log("Fetch Response:", JSON.stringify(fetchData, null, 2));
            }
        } else {
            const text = await response.text();
            console.log("Response (Text):", text);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

testCreateLocation();
