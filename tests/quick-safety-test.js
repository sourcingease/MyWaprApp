/**
 * Quick Safety Officer Dashboard Test (No Recording)
 * Tests auth handling and popup dismissal
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!'
};

async function main() {
  console.log('🎬 Starting Quick Safety Officer Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log(`   ⚠ Dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  // Handle console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   ⚠ Console Error: ${msg.text()}`);
    }
  });

  try {
    // Login
    console.log('🔐 LOGIN\n');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Login page loaded');

    await page.waitForSelector('#email', { visible: true, timeout: 10000 });
    await page.type('#email', TEST_USER.email);
    await page.waitForTimeout(500);
    
    await page.type('#password', TEST_USER.password);
    await page.waitForTimeout(500);

    await page.click('#loginBtn');
    console.log('   ✓ Login button clicked');
    await page.waitForTimeout(5000);

    // Navigate to Safety Officer dashboard
    console.log('\n📊 SAFETY OFFICER DASHBOARD\n');
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Dashboard loaded');
    await page.waitForTimeout(3000);

    // Wait for page elements
    const sidebar = await page.$('.sidebar');
    if (sidebar) {
      console.log('   ✓ Sidebar found');
    } else {
      console.log('   ⚠ Sidebar not found');
    }

    const actionButtons = await page.$$('a.action-btn');
    console.log(`   ✓ Found ${actionButtons.length} action buttons`);

    // Test clicking incidents
    console.log('\n🚨 TESTING INCIDENTS TAB\n');
    const incidentsBtn = await page.$('a.action-btn[onclick*="incidents"]');
    if (incidentsBtn) {
      await incidentsBtn.click();
      console.log('   ✓ Incidents button clicked');
      await page.waitForTimeout(3000);

      // Check if tab content loaded
      const tabContent = await page.$('#tab-incidents, .tab-content');
      if (tabContent) {
        console.log('   ✓ Tab content found');
      } else {
        console.log('   ⚠ Tab content not found');
      }
    } else {
      console.log('   ⚠ Incidents button not found');
    }

    // Test clicking fire safety
    console.log('\n🔥 TESTING FIRE SAFETY TAB\n');
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    const fireBtn = await page.$('a.action-btn[onclick*="fire"]');
    if (fireBtn) {
      await fireBtn.click();
      console.log('   ✓ Fire Safety button clicked');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠ Fire Safety button not found');
    }

    console.log('\n✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('✅ Browser closed');
  }
}

main().catch(console.error);
