/**
 * ComplytEX - Interactive Step-by-Step Testing
 * Tests with user involvement at each stage
 */

const puppeteer = require('puppeteer');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!'
};

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise wrapper for user input
function askUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Utility: Wait and show status
async function pause(message, page) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`⏸️  PAUSED: ${message}`);
  console.log(`${'='.repeat(60)}`);
  
  // Show current page info
  const url = page.url();
  const title = await page.title();
  console.log(`\n📍 Current Page: ${title}`);
  console.log(`🔗 URL: ${url}\n`);
  
  const answer = await askUser('Press ENTER to continue, or type "stop" to end test: ');
  
  if (answer === 'stop' || answer === 'exit' || answer === 'quit') {
    return false;
  }
  return true;
}

// Safe click with feedback
async function safeClick(page, selector, label) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    console.log(`   ✓ Clicking: ${label}`);
    await page.click(selector);
    await page.waitForTimeout(1500);
    return true;
  } catch (error) {
    console.log(`   ⚠ Could not click ${label}: ${error.message}`);
    return false;
  }
}

// Check element exists
async function checkElement(page, selector, name) {
  const element = await page.$(selector);
  const exists = element !== null;
  console.log(`   ${exists ? '✅' : '❌'} ${name}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
  return exists;
}

// Scroll page
async function scrollPage(page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 3);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.scrollTo(0, (document.body.scrollHeight * 2) / 3);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function main() {
  console.log('\n🎬 ComplytEX Interactive Step-by-Step Testing\n');
  console.log('This test will pause at each major step for your review.\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  
  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log(`   💬 Dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // ═══════════════════════════════════════════
    // STEP 1: LOGIN
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  🔐 STEP 1: LOGIN PAGE                  │');
    console.log('└─────────────────────────────────────────┘\n');
    
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Login page loaded');
    await page.waitForTimeout(1000);

    await checkElement(page, '#email', 'Email field');
    await checkElement(page, '#password', 'Password field');
    await checkElement(page, '#loginBtn', 'Login button');

    // Type credentials
    await page.type('#email', TEST_USER.email, { delay: 50 });
    console.log('   ✓ Email entered');
    await page.type('#password', TEST_USER.password, { delay: 50 });
    console.log('   ✓ Password entered');

    if (!await pause('Login credentials ready. Review the form.', page)) {
      await browser.close();
      rl.close();
      return;
    }

    // Click login
    await page.click('#loginBtn');
    console.log('   ✓ Login button clicked');
    console.log('   ⏳ Waiting for authentication to complete...');
    await page.waitForTimeout(8000);

    // Check where we landed
    const currentUrl = page.url();
    console.log(`   ✓ Redirected to: ${currentUrl}`);
    
    // Check for login errors
    if (currentUrl.includes('login.html')) {
      const errorMsg = await page.$eval('.error-message', el => el.textContent).catch(() => null);
      if (errorMsg) {
        console.log(`   ❌ Login error: ${errorMsg}`);
      }
      const toastMsg = await page.$eval('.toast', el => el.textContent).catch(() => null);
      if (toastMsg) {
        console.log(`   📢 Toast message: ${toastMsg}`);
      }
    }

    // ═══════════════════════════════════════════
    // STEP 2: LANDING PAGE & AGENTS
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  📊 STEP 2: LANDING PAGE & AGENTS       │');
    console.log('└─────────────────────────────────────────┘\n');

    // Check current URL again for Step 2
    let landingUrl = page.url();
    console.log(`   ✓ Current page: ${landingUrl}`);

    // Navigate to Safety Officer dashboard if not already there
    if (!landingUrl.includes('safety-office.html')) {
      console.log('   → Navigating to Safety Officer dashboard...');
      await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
    }
    
    console.log('   ⏳ Waiting for agents to load...');
    await page.waitForTimeout(5000);
    await scrollPage(page);

    // Check landing page elements
    console.log('\n   🔍 Checking Landing Page Elements:');
    await checkElement(page, '.sidebar', 'Sidebar navigation');
    await checkElement(page, '.working-pane', 'Working pane');
    await checkElement(page, '.safety-pane', 'Safety panel');
    
    // Check agents
    console.log('\n   🔍 Checking Agents:');
    await checkElement(page, '#safety-agents-panel', 'Agents panel container');
    
    // Check for agent loading errors in console
    const agentErrors = await page.evaluate(() => {
      const errors = [];
      if (window.agentLoadError) errors.push(window.agentLoadError);
      return errors;
    }).catch(() => []);
    
    if (agentErrors.length > 0) {
      console.log(`   ⚠️  Agent loading errors: ${agentErrors.join(', ')}`);
    }
    
    const agentCount = await page.$$eval('.agent-box', agents => agents.length).catch(() => 0);
    console.log(`   ${agentCount > 0 ? '✅' : '⚠️ '} Agent boxes found: ${agentCount}`);
    
    const actionBtnCount = await page.$$eval('a.action-btn', btns => btns.length).catch(() => 0);
    console.log(`   ${actionBtnCount > 0 ? '✅' : '⚠️ '} Action buttons found: ${actionBtnCount}`);

    // Check for toast system
    const hasToast = await page.evaluate(() => typeof window.showToast === 'function');
    console.log(`   ${hasToast ? '✅' : '❌'} Toast notification system: ${hasToast ? 'ACTIVE' : 'NOT FOUND'}`);

    if (!await pause('Landing page loaded. Review agents and layout.', page)) {
      await browser.close();
      rl.close();
      return;
    }

    // ═══════════════════════════════════════════
    // STEP 3: SETUP MODULE
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  ⚙️  STEP 3: SETUP MODULE                │');
    console.log('└─────────────────────────────────────────┘\n');

    // Navigate to profile/setup (usually in sidebar or top menu)
    console.log('   🔍 Looking for Setup/Profile options...');
    
    // Check for common setup links
    const hasProfileLink = await checkElement(page, 'a[href*="profile"]', 'Profile link');
    const hasSettingsLink = await checkElement(page, 'a[href*="settings"]', 'Settings link');
    const hasSetupLink = await checkElement(page, 'a[href*="setup"]', 'Setup link');

    if (hasProfileLink) {
      const clicked = await safeClick(page, 'a[href*="profile"]', 'Profile');
      if (clicked) {
        await page.waitForTimeout(2000);
        await scrollPage(page);
      }
    }

    if (!await pause('Setup/Profile section. Review available options.', page)) {
      await browser.close();
      rl.close();
      return;
    }

    // ═══════════════════════════════════════════
    // STEP 4: SETUP TABS
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  📑 STEP 4: SETUP TABS                   │');
    console.log('└─────────────────────────────────────────┘\n');

    // Look for tabs in the setup area
    const tabs = await page.$$eval('.tab-item, .ct, .nav-link', elements => 
      elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
    );
    
    if (tabs.length > 0) {
      console.log(`   ✅ Found ${tabs.length} tabs/links:`);
      tabs.slice(0, 10).forEach((tab, index) => {
        console.log(`      ${index + 1}. ${tab}`);
      });
    }

    await scrollPage(page);

    if (!await pause('Setup tabs visible. Which tab should we test?', page)) {
      await browser.close();
      rl.close();
      return;
    }

    // ═══════════════════════════════════════════
    // STEP 5: SAFETY MODULE TABS
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  🛡️  STEP 5: SAFETY MODULE TABS          │');
    console.log('└─────────────────────────────────────────┘\n');

    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    console.log('   📋 Available Safety Tabs:');
    const safetyTabs = [
      { name: 'Incidents', selector: 'a.action-btn[onclick*="incidents"]' },
      { name: 'Grievances', selector: 'a.action-btn[onclick*="grievances"]' },
      { name: 'USC-Safe', selector: 'a.action-btn[onclick*="usc-safe"]' },
      { name: 'Fire Safety', selector: 'a.action-btn[onclick*="fire"]' },
      { name: 'Electrical', selector: 'a.action-btn[onclick*="electrical"]' },
      { name: 'Structural', selector: 'a.action-btn[onclick*="structural"]' },
      { name: 'Health', selector: 'a.action-btn[onclick*="health"]' },
      { name: 'Gas Safety', selector: 'a.action-btn[onclick*="gas"]' },
      { name: 'Boiler', selector: 'a.action-btn[onclick*="boiler"]' },
      { name: 'Consultant', selector: 'a.action-btn[onclick*="consultant"]' },
      { name: 'DSA', selector: 'a.action-btn[onclick*="dsa"]' },
      { name: 'Emergency Power', selector: 'a.action-btn[onclick*="emergency"]' }
    ];

    safetyTabs.forEach((tab, index) => {
      console.log(`      ${index + 1}. ${tab.name}`);
    });

    if (!await pause('Ready to test Safety tabs one by one?', page)) {
      await browser.close();
      rl.close();
      return;
    }

    // Test each safety tab
    for (const tab of safetyTabs) {
      console.log(`\n   🔹 Testing: ${tab.name}`);
      
      const clicked = await safeClick(page, tab.selector, tab.name);
      if (clicked) {
        await page.waitForTimeout(2000);
        await scrollPage(page);
        
        const continueTest = await askUser(`   Tested ${tab.name}. Continue to next tab? (yes/no): `);
        if (continueTest === 'no' || continueTest === 'n' || continueTest === 'stop') {
          break;
        }
        
        // Go back to main dashboard
        await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1500);
      }
    }

    // ═══════════════════════════════════════════
    // STEP 6: OTHER MODULES
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  📦 STEP 6: OTHER MODULES                │');
    console.log('└─────────────────────────────────────────┘\n');

    console.log('   Available modules to test:');
    console.log('      1. CRM (Contacts, Leads, etc.)');
    console.log('      2. HR (Employees, Attendance, etc.)');
    console.log('      3. Accounting (Invoices, Payments, etc.)');
    console.log('      4. Production');
    console.log('      5. Tasks');
    console.log('      6. Reports');
    console.log('      7. Training');

    const testMore = await askUser('\n   Do you want to test any other modules? (yes/no): ');
    
    if (testMore === 'yes' || testMore === 'y') {
      const moduleName = await askUser('   Which module? (crm/hr/accounting/production/tasks/reports/training): ');
      
      console.log(`\n   → Testing ${moduleName.toUpperCase()} module...`);
      
      let moduleUrl = '';
      switch(moduleName) {
        case 'crm':
          moduleUrl = '/crm.html';
          break;
        case 'hr':
          moduleUrl = '/employees.html';
          break;
        case 'accounting':
          moduleUrl = '/accounting/dashboard.html';
          break;
        case 'production':
          moduleUrl = '/production.html';
          break;
        case 'tasks':
          moduleUrl = '/tasks/planning.html';
          break;
        case 'reports':
          moduleUrl = '/report.html';
          break;
        case 'training':
          moduleUrl = '/training.html';
          break;
        default:
          console.log('   ⚠ Unknown module');
      }

      if (moduleUrl) {
        await page.goto(`${BASE_URL}${moduleUrl}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        await scrollPage(page);
        
        await pause(`${moduleName.toUpperCase()} module loaded. Review content.`, page);
      }
    }

    // ═══════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  ✅ TEST SUMMARY                         │');
    console.log('└─────────────────────────────────────────┘\n');

    console.log('   Completed sections:');
    console.log('   ✓ Login page');
    console.log('   ✓ Landing page & agents');
    console.log('   ✓ Setup module');
    console.log('   ✓ Safety tabs');
    console.log('   ✓ Additional modules (if requested)');

    const anotherTest = await askUser('\n   Do you want to test anything else? (yes/no): ');
    
    if (anotherTest === 'yes' || anotherTest === 'y') {
      const customTest = await askUser('   What would you like to test? (describe or provide URL): ');
      console.log(`\n   → Custom test: ${customTest}`);
      
      if (customTest.includes('http')) {
        await page.goto(customTest, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        await scrollPage(page);
        await pause('Custom page loaded.', page);
      }
    }

    console.log('\n\n═══════════════════════════════════════════');
    console.log('✅ INTERACTIVE TEST COMPLETED');
    console.log('═══════════════════════════════════════════\n');

    console.log('Thank you for using the interactive testing tool!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
    rl.close();
    console.log('✅ Browser closed\n');
  }
}

main().catch(console.error);
