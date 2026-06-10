const axios = require('axios');

async function test() {
  try {
    console.log('Attempting login...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/login', {
      username: 'INN004',
      password: '25-12-2002',
      role: 'employee'
    });
    
    console.log('Login status:', loginRes.status);
    console.log('Set-Cookie headers:', loginRes.headers['set-cookie']);
    
    const cookieHeader = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
    console.log('Cookie to use:', cookieHeader);

    console.log('\nFetching notifications...');
    const notifRes = await axios.get('http://localhost:3000/api/v1/employee/notifications', {
      headers: {
        Cookie: cookieHeader
      }
    });

    console.log('Notification Status:', notifRes.status);
    console.log('Notification Data:', JSON.stringify(notifRes.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Headers:', error.response.headers);
      console.log('Error Data:', error.response.data);
    } else {
      console.error('Request failed:', error.message);
    }
  }
}

test();
