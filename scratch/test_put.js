import fetch from 'node-fetch';

async function testPut() {
  const employeeId = '69f9c6544e2de34dca21f687'; // EMP003 actual MongoDB _id
  const url = `http://localhost:3000/api/v1/admin/payroll/employees/${employeeId}`;
  
  // 1. Get current state
  let res = await fetch(url);
  let employee = await res.json();
  console.log('Current isTDSApplicable:', employee.isTDSApplicable);
  
  // 2. Toggle it
  employee.isTDSApplicable = !employee.isTDSApplicable;
  console.log('Setting isTDSApplicable to:', employee.isTDSApplicable);
  
  res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employee)
  });
  
  if (res.ok) {
    const updated = await res.json();
    console.log('Update Successful. New isTDSApplicable:', updated.isTDSApplicable);
  } else {
    const err = await res.json();
    console.log('Update Failed:', err);
  }
}

testPut().catch(console.error);
