const http = require('http');

const testCases = [
    { role: 'admin', username: 'aDmIn@softtech.com', password: 'badpwd' },
    { role: 'admin', username: 'aDm001', password: 'badpwd' },
    { role: 'employee', username: 'EMP123', password: '01-01-1990' },
];

async function runTest(tc) {
    return new Promise((resolve) => {
        const data = JSON.stringify(tc);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        const req = http.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(`Role: ${tc.role}, Username: ${tc.username} => ${res.statusCode} ${body}`));
        });
        req.on('error', e => resolve(`Error: ${e.message}`));
        req.write(data);
        req.end();
    });
}

async function main() {
    for (const tc of testCases) {
        console.log(await runTest(tc));
    }
}
main();
