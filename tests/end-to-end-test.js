/**
 * ComplytEX End-to-End Testing Suite
 * Tests all modules: Safety, HR, Accounting, CRM, Reports, Audits
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

// Test configuration
const BASE_URL = 'http://localhost:3000';
let authCookie = '';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to get user input from console
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Helper function to make HTTP requests
async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
        ...options.headers
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      
      // Capture cookies
      if (res.headers['set-cookie']) {
        authCookie = res.headers['set-cookie'].join('; ');
      }

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test logging
function logTest(name, passed, details = '') {
  const result = { name, passed, details, timestamp: new Date().toISOString() };
  testResults.tests.push(result);
  
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
  }
  
  if (details) {
    console.log(`   ${details}`);
  }
}

// ==================== TEST SUITES ====================

// 1. Authentication & User Management Tests
async function testAuthentication() {
  console.log('\n📝 Testing Authentication & User Management...\n');

  try {
    // Test login
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'safety@demo.example', password: 'Welcome123!' }
    });

    // Check if 2FA is required
    if (loginRes.data.requires2fa || loginRes.data.requiresOtp) {
      console.log('\n🔐 2FA Required: Please enter your Google Authenticator code');
      const code = await askQuestion('Enter 6-digit code: ');
      
      // Verify 2FA
      const verify2faRes = await request('/api/auth/verify-2fa', {
        method: 'POST',
        body: { email: 'safety@demo.example', code: code.trim() }
      });

      logTest('User Login with 2FA', verify2faRes.status === 200 && verify2faRes.data.success, 
        verify2faRes.data.success ? `Logged in as ${verify2faRes.data.user?.email || 'safety@demo.example'}` : verify2faRes.data.error);
    } else {
      logTest('User Login', loginRes.status === 200 && loginRes.data.success, 
        loginRes.data.success ? `Logged in as ${loginRes.data.user?.email}` : loginRes.data.error);
    }

    // Test session validation
    const sessionRes = await request('/api/auth/session');
    logTest('Session Validation', sessionRes.status === 200, 
      sessionRes.data.user ? `User: ${sessionRes.data.user.email}` : 'No session');

  } catch (error) {
    logTest('Authentication Tests', false, error.message);
  }
}

// 2. CRM Module Tests
async function testCRM() {
  console.log('\n📞 Testing CRM Module...\n');

  try {
    // Test create contact
    const createRes = await request('/api/contacts', {
      method: 'POST',
      body: {
        name: 'Test Customer ' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        phone: '555-1234',
        company: 'Test Company'
      }
    });

    logTest('Create Contact', createRes.status === 200 && createRes.data.success,
      createRes.data.id ? `Contact ID: ${createRes.data.id}` : createRes.data.error);

    const contactId = createRes.data.id;

    // Test list contacts
    const listRes = await request('/api/contacts');
    logTest('List Contacts', listRes.status === 200 && listRes.data.success,
      `Found ${listRes.data.data?.length || 0} contacts`);

    // Test update contact
    if (contactId) {
      const updateRes = await request(`/api/contacts/${contactId}`, {
        method: 'PUT',
        body: { name: 'Updated Test Customer', notes: 'E2E Test' }
      });
      logTest('Update Contact', updateRes.status === 200 && updateRes.data.success);
    }

    // Test delete contact
    if (contactId) {
      const deleteRes = await request(`/api/contacts/${contactId}`, {
        method: 'DELETE'
      });
      logTest('Delete Contact', deleteRes.status === 200 && deleteRes.data.success);
    }

  } catch (error) {
    logTest('CRM Tests', false, error.message);
  }
}

// 3. HR Module Tests
async function testHR() {
  console.log('\n👥 Testing HR Module...\n');

  try {
    // Test list employees
    const listRes = await request('/api/hr/employees');
    logTest('List Employees', listRes.status === 200 && listRes.data.success,
      `Found ${listRes.data.data?.length || 0} employees`);

    // Test create employee with full details
    const employeeData = {
      profile: {
        fullName: 'Test Employee ' + Date.now(),
        email: 'emp' + Date.now() + '@example.com',
        active: true,
        phone: '555-5678',
        department: 'Testing',
        employeeType: 'Salary'
      },
      totals: {
        MTD_Gross: 5000,
        YTD_Gross: 60000
      },
      payDetails: {
        Salary: 60000,
        PayFrequency: 'Monthly',
        PayType: 'Salary'
      }
    };

    const createRes = await request('/api/hr/employees/full', {
      method: 'POST',
      body: employeeData
    });

    logTest('Create Employee', createRes.status === 200 && createRes.data.success,
      createRes.data.employeeId ? `Employee ID: ${createRes.data.employeeId}` : createRes.data.error);

    // Test job postings
    const jobRes = await request('/api/hr/postings');
    logTest('List Job Postings', jobRes.status === 200 && jobRes.data.success,
      `Found ${jobRes.data.data?.length || 0} job postings`);

    // Test create job posting
    const jobData = {
      title: 'Test Position ' + Date.now(),
      department: 'Testing',
      employmentType: 'Full-Time',
      openings: 1,
      location: 'Test Location',
      jobDescription: 'E2E Test Job Posting'
    };

    const createJobRes = await request('/api/hr/postings', {
      method: 'POST',
      body: jobData
    });

    logTest('Create Job Posting', createJobRes.status === 200 && createJobRes.data.success,
      createJobRes.data.id ? `Job ID: ${createJobRes.data.id}` : createJobRes.data.error);

    // Test applicants
    const applicantsRes = await request('/api/hr/applicants');
    logTest('List Applicants', applicantsRes.status === 200 && applicantsRes.data.success,
      `Found ${applicantsRes.data.data?.length || 0} applicants`);

    // Test payroll preview
    const period = '2026-01';
    const payrollRes = await request(`/api/hr/payroll/preview?period=${period}`);
    logTest('Payroll Preview', payrollRes.status === 200 && payrollRes.data.success,
      `${payrollRes.data.data?.length || 0} employees in payroll`);

  } catch (error) {
    logTest('HR Tests', false, error.message);
  }
}

// 4. Accounting Module Tests
async function testAccounting() {
  console.log('\n💰 Testing Accounting Module...\n');

  try {
    // Test banks
    const banksRes = await request('/api/accounting/banks');
    logTest('List Banks', banksRes.status === 200 && banksRes.data.success,
      `Found ${banksRes.data.data?.length || 0} banks`);

    // Test AP Invoices
    const apRes = await request('/api/accounting/ap');
    logTest('List AP Invoices', apRes.status === 200 && apRes.data.success,
      `Found ${apRes.data.data?.length || 0} payable invoices`);

    const apPending = await request('/api/accounting/ap?status=Pending');
    logTest('List Pending AP', apPending.status === 200 && apPending.data.success,
      `${apPending.data.data?.length || 0} pending payments`);

    const apPaid = await request('/api/accounting/ap?status=Paid');
    logTest('List Paid AP', apPaid.status === 200 && apPaid.data.success,
      `${apPaid.data.data?.length || 0} paid invoices`);

    // Test AR Invoices
    const arRes = await request('/api/accounting/ar');
    logTest('List AR Invoices', arRes.status === 200 && arRes.data.success,
      `Found ${arRes.data.data?.length || 0} receivable invoices`);

    // Test Bank Ledger
    const ledgerRes = await request('/api/accounting/ledger');
    logTest('Bank Ledger', ledgerRes.status === 200 && ledgerRes.data.success,
      `Found ${ledgerRes.data.data?.length || 0} transactions`);

    // Test create bank
    const bankData = {
      name: 'Test Bank ' + Date.now(),
      accountNumber: 'TEST' + Date.now(),
      branch: 'Test Branch',
      balance: 100000
    };

    const createBankRes = await request('/api/accounting/banks', {
      method: 'POST',
      body: bankData
    });

    logTest('Create Bank', createBankRes.status === 200 && createBankRes.data.success,
      createBankRes.data.id ? `Bank ID: ${createBankRes.data.id}` : createBankRes.data.error);

  } catch (error) {
    logTest('Accounting Tests', false, error.message);
  }
}

// 5. Safety & Audit Module Tests
async function testSafety() {
  console.log('\n🦺 Testing Safety & Audit Module...\n');

  try {
    // Test Fire Safety
    const fireData = {
      SmokingProhibited: 'Yes',
      NoSmokingSigns: 'Yes',
      FireExtinguishers: 'Yes',
      FireAlarm: 'Yes',
      EmergencyExit: 'Yes',
      Notes: 'E2E Test - Fire Safety'
    };

    const fireRes = await request('/api/safety/fire-safety', {
      method: 'POST',
      body: fireData
    });

    logTest('Save Fire Safety Data', fireRes.status === 200 && fireRes.data.success,
      fireRes.data.success ? 'Fire safety data saved' : fireRes.data.error);

    // Test load fire safety
    const fireLoadRes = await request('/api/safety/fire-safety');
    logTest('Load Fire Safety Data', fireLoadRes.status === 200 && fireLoadRes.data.success,
      fireLoadRes.data.data ? 'Fire safety data loaded' : 'No data found');

    // Test Electrical Safety
    const electricalData = {
      ProperWiring: 'Yes',
      CircuitBreakers: 'Yes',
      Grounding: 'Yes',
      Notes: 'E2E Test - Electrical Safety'
    };

    const electricalRes = await request('/api/safety/electrical-safety', {
      method: 'POST',
      body: electricalData
    });

    logTest('Save Electrical Safety Data', electricalRes.status === 200 && electricalRes.data.success);

    // Test Safety Audits
    const auditsRes = await request('/api/safety/audits');
    logTest('List Safety Audits', auditsRes.status === 200 && auditsRes.data.success,
      `Found ${auditsRes.data.data?.length || 0} audits`);

    // Test Safety Training
    const trainingRes = await request('/api/safety/training');
    logTest('Safety Training Records', trainingRes.status === 200 && trainingRes.data.success,
      `Found ${trainingRes.data.data?.length || 0} training records`);

  } catch (error) {
    logTest('Safety Tests', false, error.message);
  }
}

// 6. Dashboard & Reports Tests
async function testReports() {
  console.log('\n📊 Testing Dashboard & Reports...\n');

  try {
    // Test dashboard stats
    const statsRes = await request('/api/dashboard/stats');
    logTest('Dashboard Statistics', statsRes.status === 200 || statsRes.status === 404,
      statsRes.status === 200 ? 'Stats loaded' : 'Stats endpoint not available');

    // Test company profile
    const profileRes = await request('/api/profile');
    logTest('Company Profile', profileRes.status === 200 && profileRes.data.success,
      profileRes.data.data ? `Company: ${profileRes.data.data.CompanyName || 'N/A'}` : 'No profile');

  } catch (error) {
    logTest('Reports Tests', false, error.message);
  }
}

// 7. Waste Management Tests
async function testWasteManagement() {
  console.log('\n♻️ Testing Waste Management...\n');

  try {
    // Test waste management data
    const wasteRes = await request('/api/waste-management');
    logTest('Waste Management Data', wasteRes.status === 200 && wasteRes.data.success,
      `Found ${wasteRes.data.data?.length || 0} waste records`);

    // Test waste disposal
    const disposalRes = await request('/api/waste-disposal');
    logTest('Waste Disposal Records', disposalRes.status === 200 && disposalRes.data.success,
      `Found ${disposalRes.data.data?.length || 0} disposal records`);

  } catch (error) {
    logTest('Waste Management Tests', false, error.message);
  }
}

// 8. Water Management Tests
async function testWaterManagement() {
  console.log('\n💧 Testing Water Management...\n');

  try {
    const waterRes = await request('/api/water-management');
    logTest('Water Management Data', waterRes.status === 200 && waterRes.data.success,
      `Found ${waterRes.data.data?.length || 0} water records`);

  } catch (error) {
    logTest('Water Management Tests', false, error.message);
  }
}

// 9. Integration Tests (Cross-module workflows)
async function testIntegration() {
  console.log('\n🔗 Testing Cross-Module Integration...\n');

  try {
    // Test: Create Employee → Generate Payroll → Create AP Invoice → Pay Invoice
    console.log('   Testing workflow: Employee → Payroll → AP Payment...');

    // Step 1: Verify employees exist
    const empRes = await request('/api/hr/employees');
    const hasEmployees = empRes.data.success && empRes.data.data?.length > 0;
    logTest('Integration: Employees Exist', hasEmployees,
      `${empRes.data.data?.length || 0} employees for payroll`);

    // Step 2: Generate payroll (creates AP invoices)
    const period = '2026-01';
    const payrollRes = await request('/api/hr/payroll/generate', {
      method: 'POST',
      body: { period }
    });
    logTest('Integration: Generate Payroll', payrollRes.status === 200 && payrollRes.data.success,
      `Created ${payrollRes.data.count || 0} AP invoices`);

    // Step 3: Verify AP invoices created
    const apRes = await request('/api/accounting/ap?status=Pending');
    const hasAPInvoices = apRes.data.success && apRes.data.data?.length > 0;
    logTest('Integration: AP Invoices Created', hasAPInvoices,
      `${apRes.data.data?.length || 0} pending AP invoices`);

    // Test: Safety Audit → Report Generation
    console.log('   Testing workflow: Safety Audit → Report...');
    
    const auditRes = await request('/api/safety/audits');
    logTest('Integration: Safety Audits Available', auditRes.status === 200 && auditRes.data.success);

  } catch (error) {
    logTest('Integration Tests', false, error.message);
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ComplytEX End-to-End Testing Suite');
  console.log('='.repeat(60));
  console.log(`📅 Started: ${new Date().toLocaleString()}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Run all test suites
  await testAuthentication();
  await testCRM();
  await testHR();
  await testAccounting();
  await testSafety();
  await testReports();
  await testWasteManagement();
  await testWaterManagement();
  await testIntegration();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total Tests: ${testResults.tests.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // List failed tests
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }

  console.log('\n📄 Full test results saved to: test-results.json\n');

  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync('test-results.json', JSON.stringify(testResults, null, 2));

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
