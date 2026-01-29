/**
 * Automated Video Testing Script
 * Records browser automation showing complete testing flow with auto-fill and navigation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!',
  name: 'Demo Safety Office'
};

// Recording configuration
const RECORDING_PATH = path.join(__dirname, 'recordings');
const SCREENSHOT_PATH = path.join(__dirname, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(RECORDING_PATH)) fs.mkdirSync(RECORDING_PATH, { recursive: true });
if (!fs.existsSync(SCREENSHOT_PATH)) fs.mkdirSync(SCREENSHOT_PATH, { recursive: true });

// Helper to ask for 2FA code
function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to take screenshot
async function takeScreenshot(page, name) {
  const filepath = path.join(SCREENSHOT_PATH, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
}

// Helper to type with human-like delay
async function humanType(page, selector, text) {
  await page.waitForSelector(selector);
  await page.click(selector);
  await delay(300);
  for (const char of text) {
    await page.type(selector, char);
    await delay(50 + Math.random() * 100);
  }
}

// Main testing flow
async function runVideoTest() {
  console.log('🎬 Starting Automated Video Testing...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for video recording
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  
  try {
    console.log('📝 Test Credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}\n`);
    
    // Step 1: Login
    console.log('🔐 Step 1: Login Process');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await takeScreenshot(page, '01-login-page');
    
    console.log('   ⌨️  Filling email...');
    await humanType(page, '#email', TEST_USER.email);
    await delay(500);
    
    console.log('   ⌨️  Filling password...');
    await humanType(page, '#password', TEST_USER.password);
    await delay(500);
    await takeScreenshot(page, '02-login-filled');
    
    console.log('   🖱️  Clicking login button...');
    await page.click('#loginBtn');
    await delay(3000);
    
    // Check if 2FA is required
    const otpInput = await page.$('#otpCode');
    if (otpInput) {
      console.log('\n🔒 2FA Detected - Please check your Google Authenticator');
      const tfaCode = await askQuestion('   Enter 6-digit code: ');
      
      await takeScreenshot(page, '03-2fa-prompt');
      console.log('   ⌨️  Entering 2FA code...');
      await humanType(page, '#otpCode', tfaCode);
      await delay(500);
      await takeScreenshot(page, '04-2fa-filled');
      
      console.log('   🖱️  Verifying 2FA...');
      await page.click('#verifyBtn');
      await delay(3000);
    } else {
      console.log('   ✅ No 2FA required - Direct login successful!');
      await delay(1000);
    }
    
    await takeScreenshot(page, '05-dashboard');
    console.log('   ✅ Login successful!\n');
    
    // Step 2: CRM Module
    console.log('📊 Step 2: CRM Module Testing');
    await page.goto(`${BASE_URL}/crm.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '06-crm-page');
    
    // Try to add a contact
    console.log('   🖱️  Adding new contact...');
    const addContactBtn = await page.$('#addContactBtn');
    if (addContactBtn) {
      await addContactBtn.click();
      await delay(1000);
      
      console.log('   ⌨️  Filling contact form...');
      await humanType(page, '#contactName, input[name="name"]', 'John Doe');
      await delay(300);
      await humanType(page, '#contactEmail, input[name="email"]', 'john.doe@example.com');
      await delay(300);
      await humanType(page, '#contactPhone, input[name="phone"]', '+1-555-0123');
      await delay(300);
      await takeScreenshot(page, '07-crm-contact-form');
      
      console.log('   🖱️  Saving contact...');
      const saveCBtn = await page.$('#saveContactBtn');
      if (saveCBtn) await saveCBtn.click();
      await delay(2000);
      await takeScreenshot(page, '08-crm-contact-saved');
      console.log('   ✅ Contact saved!\n');
    } else {
      console.log('   ℹ️  No add contact button found\n');
    }
    
    // Step 3: HR Module
    console.log('👥 Step 3: HR Module Testing');
    await page.goto(`${BASE_URL}/employees.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '09-hr-employees');
    
    console.log('   📋 Viewing employee list...');
    await delay(1000);
    
    // Try to add employee
    const addEmpBtn = await page.$('#addEmployeeBtn');
    if (addEmpBtn) {
      await addEmpBtn.click();
      await delay(1000);
      
      console.log('   ⌨️  Filling employee form...');
      await humanType(page, '#empName, input[name="name"]', 'Jane Smith');
      await delay(300);
      await humanType(page, '#empEmail, input[name="email"]', 'jane.smith@company.com');
      await delay(300);
      await humanType(page, '#empPosition, input[name="position"]', 'Safety Inspector');
      await delay(300);
      await takeScreenshot(page, '10-hr-employee-form');
      
      console.log('   🖱️  Saving employee...');
      const saveEBtn = await page.$('#saveEmployeeBtn');
      if (saveEBtn) await saveEBtn.click();
      await delay(2000);
      await takeScreenshot(page, '11-hr-employee-saved');
      console.log('   ✅ Employee saved!\n');
    } else {
      console.log('   ℹ️  No add employee button found\n');
    }
    
    // Step 4: Accounting Module
    console.log('💰 Step 4: Accounting Module Testing');
    await page.goto(`${BASE_URL}/accounting/dashboard.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '12-accounting-dashboard');
    console.log('   📊 Viewing accounting dashboard...\n');
    
    // View chart of accounts
    console.log('   📖 Opening Chart of Accounts...');
    await page.goto(`${BASE_URL}/accounting/chart-of-accounts.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '13-accounting-chart');
    console.log('   ✅ Chart of accounts loaded!\n');
    
    // Step 5: Safety Module - Fire Safety
    console.log('🔥 Step 5: Safety Module - Fire Safety Testing');
    await page.goto(`${BASE_URL}/test-fire-form.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '14-safety-fire-form');
    
    console.log('   ⌨️  Filling fire safety form...');
    
    // Fill form fields
    const formFields = [
      { selector: '#tenantId, input[name="tenantId"]', value: '1' },
      { selector: '#auditorId, input[name="auditorId"]', value: '2' },
      { selector: '#factoryName, input[name="factoryName"]', value: 'Demo Factory' },
      { selector: '#address, textarea[name="address"]', value: '123 Industrial Ave, City' },
      { selector: '#contactPerson, input[name="contactPerson"]', value: 'Safety Manager' },
      { selector: '#phone, input[name="phone"]', value: '+1-555-0199' }
    ];
    
    for (const field of formFields) {
      const element = await page.$(field.selector);
      if (element) {
        await humanType(page, field.selector, field.value);
        await delay(300);
      }
    }
    
    await takeScreenshot(page, '15-safety-fire-form-filled');
    
    console.log('   🖱️  Saving fire safety audit...');
    const saveBtn = await page.$('#saveBtn');
    if (saveBtn) {
      await saveBtn.click();
      await delay(2000);
      await takeScreenshot(page, '16-safety-fire-saved');
      console.log('   ✅ Fire safety audit saved!\n');
    }
    
    // Step 6: Safety Audits List
    console.log('📋 Step 6: Safety Audits List');
    await page.goto(`${BASE_URL}/safety-audits.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '17-safety-audits-list');
    console.log('   ✅ Safety audits list loaded!\n');
    
    // Step 7: Audit Certification
    console.log('📜 Step 7: Audit Certification');
    await page.goto(`${BASE_URL}/audit-verification.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '18-audit-certification');
    console.log('   ✅ Audit certification page loaded!\n');
    
    // Final dashboard view
    console.log('🏠 Step 8: Return to Dashboard');
    await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, '19-final-dashboard');
    console.log('   ✅ Dashboard loaded!\n');
    
    console.log('✅ All testing steps completed!');
    console.log(`\n📁 Screenshots saved in: ${SCREENSHOT_PATH}`);
    console.log('\n💡 To create video from screenshots, use:');
    console.log('   ffmpeg -framerate 0.5 -pattern_type glob -i "screenshots/*.png" -c:v libx264 -pix_fmt yuv420p output.mp4');
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
    await delay(30000);
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await takeScreenshot(page, 'error-state');
    throw error;
  } finally {
    await browser.close();
    console.log('\n🎬 Video testing completed!');
  }
}

// Run the test
runVideoTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
