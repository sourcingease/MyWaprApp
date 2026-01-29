// Quick test to verify login works without 2FA
const http = require('http');

const loginData = JSON.stringify({
  email: 'safety@demo.example',
  password: 'Welcome123!'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔐 Testing login endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('🍪 Cookies:', res.headers['set-cookie']);
    console.log('\n📦 Response Body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.twoFactorRequired || json.requires2fa || json.requiresOtp) {
        console.log('\n❌ ERROR: 2FA is still required!');
        console.log('   The database shows 2FA is disabled, but login endpoint still requires it.');
        console.log('   Need to restart the server or check login logic.');
      } else if (json.success && json.token) {
        console.log('\n✅ SUCCESS: Login works without 2FA!');
        console.log('   Token received, ready for video testing.');
      } else {
        console.log('\n⚠️  Unexpected response format');
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('\n⚠️  Make sure the server is running on port 3000');
});

req.write(loginData);
req.end();
