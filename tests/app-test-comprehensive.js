/**
 * Comprehensive Application Testing Script
 * 
 * Tests all main endpoints of the SaaS Agent application:
 * - Authentication (register, login, logout)
 * - Database connection
 * - Contacts management (CRUD operations)
 * - API health checks
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const results = [];

/**
 * Make HTTP request helper
 */
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Log test result
 */
function logResult(testName, passed, message = '') {
  const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  console.log(`${status} - ${testName}`);
  if (message) console.log(`  ${colors.cyan}${message}${colors.reset}`);
  
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
  
  results.push({ testName, passed, message });
}

/**
 * Test 1: Health Check - Home Page
 */
async function testHomePageHealth() {
  try {
    const response = await makeRequest('GET', '/');
    const passed = response.status === 200;
    logResult('Health Check: Home Page', passed, `Status: ${response.status}`);
  } catch (error) {
    logResult('Health Check: Home Page', false, error.message);
  }
}

/**
 * Test 2: Database Connection Test
 */
async function testDatabaseConnection() {
  try {
    const response = await makeRequest('POST', '/api/test-connection', {});
    const passed = response.status === 200;
    logResult('Database: Connection Test', passed, `Status: ${response.status}`);
  } catch (error) {
    logResult('Database: Connection Test', false, error.message);
  }
}

/**
 * Test 3: User Registration
 */
async function testUserRegistration() {
  try {
    const testEmail = `testuser_${Date.now()}@test.com`;
    const userData = {
      name: 'Test User',
      email: testEmail,
      password: 'TestPassword123!',
      company: 'Test Company'
    };

    const response = await makeRequest('POST', '/api/auth/register', userData);
    const passed = response.status === 200 || response.status === 201;
    const message = response.body.message || response.body.error || `Status: ${response.status}`;
    logResult('Auth: User Registration', passed, message);
    
    return testEmail;
  } catch (error) {
    logResult('Auth: User Registration', false, error.message);
    return null;
  }
}

/**
 * Test 4: User Login
 */
async function testUserLogin(email) {
  if (!email) {
    logResult('Auth: User Login', false, 'Skipped - No email from registration');
    return null;
  }

  try {
    const loginData = {
      email: email,
      password: 'TestPassword123!'
    };

    const response = await makeRequest('POST', '/api/auth/login', loginData);
    const passed = response.status === 200 || response.status === 201;
    const message = response.body.message || response.body.error || `Status: ${response.status}`;
    logResult('Auth: User Login', passed, message);
    
    // Extract token if available
    const token = response.body.token || response.headers['set-cookie'];
    return token;
  } catch (error) {
    logResult('Auth: User Login', false, error.message);
    return null;
  }
}

/**
 * Test 5: Get Contacts
 */
async function testGetContacts(token = null) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await makeRequest('GET', '/api/contacts', null, headers);
    const passed = response.status === 200;
    const message = `Status: ${response.status}, Contacts: ${Array.isArray(response.body) ? response.body.length : 'N/A'}`;
    logResult('Contacts: Get Contacts', passed, message);
  } catch (error) {
    logResult('Contacts: Get Contacts', false, error.message);
  }
}

/**
 * Test 6: Add Contact
 */
async function testAddContact(token = null) {
  try {
    const contactData = {
      firstName: 'John',
      lastName: 'Doe',
      email: `contact_${Date.now()}@example.com`,
      phone: '555-0123',
      company: 'Test Corp'
    };

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await makeRequest('POST', '/api/contacts', contactData, headers);
    const passed = response.status === 200 || response.status === 201;
    const message = response.body.message || response.body.id || `Status: ${response.status}`;
    logResult('Contacts: Add Contact', passed, message);
    
    return response.body.id;
  } catch (error) {
    logResult('Contacts: Add Contact', false, error.message);
    return null;
  }
}

/**
 * Test 7: Update Contact
 */
async function testUpdateContact(contactId, token = null) {
  if (!contactId) {
    logResult('Contacts: Update Contact', false, 'Skipped - No contact ID');
    return;
  }

  try {
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith'
    };

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await makeRequest('PUT', `/api/contacts/${contactId}`, updateData, headers);
    const passed = response.status === 200;
    const message = response.body.message || `Status: ${response.status}`;
    logResult('Contacts: Update Contact', passed, message);
  } catch (error) {
    logResult('Contacts: Update Contact', false, error.message);
  }
}

/**
 * Test 8: Delete Contact
 */
async function testDeleteContact(contactId, token = null) {
  if (!contactId) {
    logResult('Contacts: Delete Contact', false, 'Skipped - No contact ID');
    return;
  }

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await makeRequest('DELETE', `/api/contacts/${contactId}`, null, headers);
    const passed = response.status === 200;
    const message = response.body.message || `Status: ${response.status}`;
    logResult('Contacts: Delete Contact', passed, message);
  } catch (error) {
    logResult('Contacts: Delete Contact', false, error.message);
  }
}

/**
 * Test 9: Login Page Accessibility
 */
async function testLoginPageAccess() {
  try {
    const response = await makeRequest('GET', '/login');
    const passed = response.status === 200;
    logResult('Pages: Login Page Access', passed, `Status: ${response.status}`);
  } catch (error) {
    logResult('Pages: Login Page Access', false, error.message);
  }
}

/**
 * Test 10: Register Page Accessibility
 */
async function testRegisterPageAccess() {
  try {
    const response = await makeRequest('GET', '/register');
    const passed = response.status === 200;
    logResult('Pages: Register Page Access', passed, `Status: ${response.status}`);
  } catch (error) {
    logResult('Pages: Register Page Access', false, error.message);
  }
}

/**
 * Print summary report
 */
function printSummary() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Total:  ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the details above.${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test execution
 */
async function runTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}SaaS AGENT - COMPREHENSIVE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.yellow}Testing URL: ${BASE_URL}${colors.reset}\n`);
  
  // Run tests
  await testHomePageHealth();
  await testLoginPageAccess();
  await testRegisterPageAccess();
  await testDatabaseConnection();
  
  const email = await testUserRegistration();
  const token = await testUserLogin(email);
  
  await testGetContacts(token);
  const contactId = await testAddContact(token);
  await testUpdateContact(contactId, token);
  await testDeleteContact(contactId, token);
  
  // Print summary
  printSummary();
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});
