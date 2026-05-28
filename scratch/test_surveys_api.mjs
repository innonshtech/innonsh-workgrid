async function checkSurveys() {
    try {
        const res = await fetch("http://localhost:3000/api/v1/admin/engagement/surveys", {
            headers: {
                "Cookie": "next-auth.session-token=your_token_here_if_needed", // Wait, we might not need auth if it's hitting the browser's context or we can use another way
            }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkSurveys();
