
const FETCH_URL = 'http://localhost:3000/api/auth/session';

async function verifyRetry(attempts = 1) {
    console.log(`\nAttempt ${attempts}: Fetching ${FETCH_URL}...`);
    try {
        const response = await fetch(FETCH_URL, {
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const contentType = response.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);

        if (response.ok) {
            const data = await response.json();
            console.log('Success! Session data recovered.');
            return true;
        } else {
            console.log(`Failed with status ${response.status}. This simulates the startup 404.`);
            if (attempts < 5) {
                console.log(`Wait for 2 seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return verifyRetry(attempts + 1);
            }
        }
    } catch (error) {
        console.error(`Error during fetch: ${error.message}`);
        if (attempts < 5) {
            console.log(`Wait for 2 seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return verifyRetry(attempts + 1);
        }
    }
    return false;
}

console.log("Starting Session API Diagnostic...");
console.log("Note: If the server is not running, this will log connection errors.");
verifyRetry().then(success => {
    if (success) {
        console.log("\nDiagnostic complete: Session API is reachable.");
    } else {
        console.log("\nDiagnostic complete: Failed to reach Session API after 5 attempts.");
    }
});
