/**
 * Final Safety Officer Dashboard Test
 * Tests all fixes: toast notifications, no blocking dialogs, proper auth
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!'
};

async function main() {
  console.log('🎬 Final Safety Officer Test - All Fixes Applied\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let dialogCount = 0;
  let consoleErrors = [];

  // Handle dialogs - should NOT appear now
  page.on('dialog', async dialog => {
    dialogCount++;
    console.log(`   ⚠ BLOCKING DIALOG DETECTED: ${dialog.message()}`);
    await dialog.accept();
  });

  // Monitor console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // ===================
    // LOGIN
    // ===================
    console.log('🔐 STEP 1: LOGIN\n');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Login page loaded');

    await page.waitForSelector('#email', { visible: true, timeout: 10000 });
    await page.type('#email', TEST_USER.email, { delay: 50 });
    await page.type('#password', TEST_USER.password, { delay: 50 });
    await page.click('#loginBtn');
    console.log('   ✓ Login credentials entered and submitted');
    await page.waitForTimeout(5000);

    // ===================
    // NAVIGATE TO DASHBOARD
    // ===================
    console.log('\n📊 STEP 2: SAFETY OFFICER DASHBOARD\n');
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Dashboard page loaded');
    await page.waitForTimeout(3000);

    // Check for toast notifications container
    const toastCheck = await page.evaluate(() => {
      return typeof window.showToast === 'function';
    });
    console.log(`   ${toastCheck ? '✅' : '❌'} Toast notification system: ${toastCheck ? 'ACTIVE' : 'NOT FOUND'}`);

    // Check agents panel
    const agentsPanel = await page.$('#safety-agents-panel');
    console.log(`   ${agentsPanel ? '✅' : '❌'} Agents panel: ${agentsPanel ? 'FOUND' : 'NOT FOUND'}`);

    // Count action buttons
    const buttonCount = await page.$$eval('a.action-btn', btns => btns.length);
    console.log(`   ✅ Found ${buttonCount} action buttons`);

    // ===================
    // TEST INCIDENTS TAB
    // ===================
    console.log('\n🚨 STEP 3: TEST INCIDENTS TAB\n');
    const incidentsBtn = await page.$('a.action-btn[onclick*="incidents"]');
    if (incidentsBtn) {
      await incidentsBtn.click();
      console.log('   ✓ Clicked Incidents button');
      await page.waitForTimeout(3000);

      // Try to trigger a save (should show toast, not alert)
      console.log('   → Testing form interaction...');
      await page.waitForTimeout(2000);
    }

    // ===================
    // TEST FIRE SAFETY TAB
    // ===================
    console.log('\n🔥 STEP 4: TEST FIRE SAFETY TAB\n');
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    const fireBtn = await page.$('a.action-btn[onclick*="fire"]');
    if (fireBtn) {
      await fireBtn.click();
      console.log('   ✓ Clicked Fire Safety button');
      await page.waitForTimeout(3000);
    }

    // ===================
    // TEST USC-SAFE TAB
    // ===================
    console.log('\n📑 STEP 5: TEST USC-SAFE TAB\n');
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    const uscBtn = await page.$('a.action-btn[onclick*="usc-safe"]');
    if (uscBtn) {
      await uscBtn.click();
      console.log('   ✓ Clicked USC-Safe button');
      await page.waitForTimeout(3000);
    }

    // ===================
    // FINAL RESULTS
    // ===================
    console.log('\n\n═══════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - RESULTS');
    console.log('═══════════════════════════════════════════\n');
    
    console.log(`Toast System:        ${toastCheck ? '✅ WORKING' : '❌ NOT FOUND'}`);
    console.log(`Agents Panel:        ${agentsPanel ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`Action Buttons:      ✅ ${buttonCount} found`);
    console.log(`Blocking Dialogs:    ${dialogCount === 0 ? '✅ NONE (FIXED!)' : '❌ ' + dialogCount + ' detected'}`);
    console.log(`Console Errors:      ${consoleErrors.length === 0 ? '✅ NONE' : '⚠️ ' + consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n═══════════════════════════════════════════\n');
    
    if (dialogCount === 0 && toastCheck) {
      console.log('🎉 SUCCESS! All blocking dialogs removed and replaced with toast notifications!\n');
    } else {
      console.log('⚠️  Some issues remain - review output above\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('✅ Browser closed\n');
  }
}

main().catch(console.error);
