const http = require('http');

const pages = [
  '/login',
  '/admin/staffing',
  '/admin/staffing/clients',
  '/admin/staffing/requirements',
  '/admin/staffing/talent-pool',
  '/admin/staffing/matching',
  '/admin/staffing/submissions'
];

async function checkPage(page) {
  return new Promise((resolve) => {
    console.log(`📡 Fetching page: ${page} to force compilation...`);
    http.get(`http://localhost:3001${page}`, {
      headers: {
        'Cookie': 'authToken=test-token' // prevent middleware redirects if possible
      }
    }, (res) => {
      console.log(`✅ Page ${page} responded with status: ${res.statusCode}`);
      resolve();
    }).on('error', (err) => {
      console.error(`❌ Failed to fetch page ${page}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  console.log("⏳ Waiting 3 seconds for server readiness...");
  await new Promise(r => setTimeout(r, 3000));
  
  for (const page of pages) {
    await checkPage(page);
    await new Promise(r => setTimeout(r, 2000)); // wait for compilation
  }
  
  console.log("🏁 On-demand page compilation run complete.");
}

run();
