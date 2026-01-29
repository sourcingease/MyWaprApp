// Test script to verify employee save functionality
const http = require('http');

// First login to get session cookie
function login(callback) {
  const loginData = JSON.stringify({
    email: 'owner@demo.example',
    password: 'Welcome123!'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const cookies = res.headers['set-cookie'];
      console.log('✅ Login successful');
      callback(cookies);
    });
  });

  loginReq.on('error', (e) => {
    console.error('❌ Login error:', e.message);
  });

  loginReq.write(loginData);
  loginReq.end();
}

// Then save employee
function saveEmployee(cookies) {
  const employeeData = JSON.stringify({
    profile: {
      fullName: 'Test Employee ' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      active: true,
      country: 'United States',
      phone: '555-1234',
      department: 'Sales',
      employeeType: 'Salary'
    },
    totals: {},
    payDetails: {}
  });

  const saveOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/hr/employees/full',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': employeeData.length,
      'Cookie': cookies ? cookies.join('; ') : ''
    }
  };

  const saveReq = http.request(saveOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', data);
      if (res.statusCode === 200) {
        const result = JSON.parse(data);
        if (result.success) {
          console.log('✅ Employee saved successfully! Employee ID:', result.employeeId);
        } else {
          console.log('❌ Save failed:', result.error);
        }
      } else {
        console.log('❌ HTTP error:', res.statusCode);
      }
    });
  });

  saveReq.on('error', (e) => {
    console.error('❌ Save request error:', e.message);
  });

  saveReq.write(employeeData);
  saveReq.end();
}

// Run the test
console.log('🧪 Testing employee save...');
login(saveEmployee);
