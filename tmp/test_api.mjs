import http from 'http';

function fetchApi(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: path,
      headers: {
        'Cookie': 'next-auth.session-token=mock-token' // Assuming the API might not strictly validate the token in dev, or we just want to see if it responds
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const res = await fetchApi('/api/v1/admin/payroll/run');
    console.log(`Status: ${res.status}`);
    const json = JSON.parse(res.data);
    if(Array.isArray(json) && json.length > 0) {
      console.log('Latest Run ID:', json[0]._id);
      const detail = await fetchApi(`/api/v1/admin/payroll/run/${json[0]._id}`);
      console.log('Detail Status:', detail.status);
      const detailJson = JSON.parse(detail.data);
      console.log('Run info:', detailJson.run);
      console.log('Payslips length:', detailJson.payslips ? detailJson.payslips.length : 0);
      if(detailJson.payslips && detailJson.payslips.length > 0) {
        console.log('Sample Payslip earnings:', detailJson.payslips[0].earnings);
      }
    } else {
      console.log("No runs or invalid response:", res.data);
    }
  } catch(e) {
    console.error(e);
  }
})();
