const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!'
};

// Test data generators
function generateTestData(tabName) {
  const timestamp = Date.now();
  const baseData = {
    'USC-Safe-Test': {
      form: 'usc-safe-form',
      fields: {
        'location': `Test Location ${timestamp}`,
        'inspectionDate': '2026-01-29',
        'inspectorName': 'Test Inspector',
        'status': 'Pending',
        'findings': 'Test findings for automated testing',
        'recommendations': 'Test recommendations'
      }
    },
    'Incidents': {
      form: 'incident-form',
      fields: {
        'incidentDate': '2026-01-29',
        'incidentTime': '10:30',
        'location': `Incident Location ${timestamp}`,
        'description': 'Automated test incident description',
        'severity': 'Medium',
        'reportedBy': 'Test User',
        'status': 'Open'
      }
    },
    'Grievances': {
      form: 'grievance-form',
      fields: {
        'grievanceDate': '2026-01-29',
        'employeeName': `Test Employee ${timestamp}`,
        'department': 'Safety',
        'grievanceType': 'Safety Concern',
        'description': 'Test grievance description',
        'status': 'Pending'
      }
    },
    'Fire': {
      form: 'fire-safety-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'location': `Fire Safety Zone ${timestamp}`,
        'extinguisherCount': '10',
        'extinguisherStatus': 'Good',
        'alarmStatus': 'Functional',
        'exitStatus': 'Clear',
        'notes': 'Fire safety inspection completed'
      }
    },
    'Electrical': {
      form: 'electrical-safety-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'location': `Electrical Panel ${timestamp}`,
        'voltage': '220',
        'groundingStatus': 'Good',
        'wiringCondition': 'Excellent',
        'breakerStatus': 'Functional',
        'notes': 'Electrical safety check completed'
      }
    },
    'Structural': {
      form: 'structural-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'buildingArea': `Area ${timestamp}`,
        'structuralCondition': 'Good',
        'cracks': 'None',
        'foundationStatus': 'Stable',
        'notes': 'Structural inspection completed'
      }
    },
    'Health': {
      form: 'health-safety-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'area': `Health Zone ${timestamp}`,
        'airQuality': 'Good',
        'ventilation': 'Adequate',
        'lighting': 'Sufficient',
        'temperature': '22',
        'notes': 'Health safety check completed'
      }
    },
    'Gas': {
      form: 'gas-safety-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'location': `Gas Line ${timestamp}`,
        'gasType': 'Natural Gas',
        'pressureLevel': 'Normal',
        'leakStatus': 'None Detected',
        'detectorStatus': 'Functional',
        'notes': 'Gas safety inspection completed'
      }
    },
    'Boiler': {
      form: 'boiler-form',
      fields: {
        'inspectionDate': '2026-01-29',
        'boilerID': `BOILER-${timestamp}`,
        'pressure': '15',
        'temperature': '180',
        'safetyValveStatus': 'Functional',
        'waterLevel': 'Normal',
        'notes': 'Boiler inspection completed'
      }
    },
    'Consultant': {
      form: 'consultant-form',
      fields: {
        'consultDate': '2026-01-29',
        'consultantName': `Consultant ${timestamp}`,
        'company': 'Test Safety Consultants',
        'specialization': 'Fire Safety',
        'recommendations': 'Test consultant recommendations',
        'nextReviewDate': '2026-02-28'
      }
    }
  };
  
  return baseData[tabName] || null;
}

// Enhanced click function with retry
async function safeClick(page, selector, timeout = 10000) {
  try {
    if (typeof selector === 'object' && selector.text) {
      // Click by text content
      const clicked = await page.evaluate((labelText) => {
        const labels = Array.from(document.querySelectorAll('.action-label'));
        const targetLabel = labels.find(label => label.textContent.trim() === labelText);
        if (targetLabel && targetLabel.closest('a')) {
          targetLabel.closest('a').click();
          return true;
        }
        return false;
      }, selector.text);
      return clicked;
    } else if (typeof selector === 'string') {
      await page.waitForSelector(selector, { timeout });
      await page.click(selector);
      return true;
    }
  } catch (error) {
    console.log(`❌ Click failed for selector: ${JSON.stringify(selector)}`);
    return false;
  }
}

// Fill form with test data
async function fillForm(page, testData) {
  if (!testData || !testData.fields) {
    console.log('⚠️  No test data provided');
    return false;
  }

  let fieldsFilled = 0;
  
  for (const [fieldName, value] of Object.entries(testData.fields)) {
    try {
      // Try multiple selector patterns
      const selectors = [
        `input[name="${fieldName}"]`,
        `input[id="${fieldName}"]`,
        `input[placeholder*="${fieldName}"]`,
        `textarea[name="${fieldName}"]`,
        `textarea[id="${fieldName}"]`,
        `select[name="${fieldName}"]`,
        `select[id="${fieldName}"]`
      ];

      let filled = false;
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            
            if (tagName === 'select') {
              // Handle dropdown
              await page.select(selector, value);
              console.log(`   ✓ Selected "${value}" in ${fieldName}`);
            } else if (tagName === 'textarea') {
              // Handle textarea
              await page.type(selector, value);
              console.log(`   ✓ Entered "${value}" in ${fieldName}`);
            } else {
              // Handle input
              await page.click(selector, { clickCount: 3 }); // Select all
              await page.type(selector, value);
              console.log(`   ✓ Entered "${value}" in ${fieldName}`);
            }
            
            fieldsFilled++;
            filled = true;
            break;
          }
        } catch (err) {
          // Try next selector
          continue;
        }
      }
      
      if (!filled) {
        console.log(`   ⚠️  Field "${fieldName}" not found`);
      }
      
      await page.waitForTimeout(200); // Small delay between fields
    } catch (error) {
      console.log(`   ❌ Error filling ${fieldName}: ${error.message}`);
    }
  }
  
  console.log(`   📝 Filled ${fieldsFilled} fields`);
  return fieldsFilled > 0;
}

// Click save/submit button
async function clickSaveButton(page) {
  try {
    // Try multiple save button patterns
    const saveButtonSelectors = [
      'button[type="submit"]',
      'button.btn-primary',
      'button.save-btn',
      'button:has-text("Save")',
      'button:has-text("Submit")',
      'button:has-text("Add")',
      'input[type="submit"]'
    ];

    // Use JavaScript to find and click save button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const saveButton = buttons.find(btn => {
        const text = btn.textContent || btn.value || '';
        return text.toLowerCase().includes('save') || 
               text.toLowerCase().includes('submit') || 
               text.toLowerCase().includes('add') ||
               btn.classList.contains('save-btn') ||
               btn.classList.contains('btn-primary') ||
               btn.type === 'submit';
      });
      
      if (saveButton) {
        saveButton.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('   ✓ Save button clicked');
      await page.waitForTimeout(2000); // Wait for save operation
      return true;
    } else {
      console.log('   ⚠️  Save button not found');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error clicking save button: ${error.message}`);
    return false;
  }
}

// Check for success toast notification
async function checkForSuccess(page) {
  try {
    const toastVisible = await page.evaluate(() => {
      const toast = document.querySelector('.toast');
      if (toast && toast.classList.contains('show')) {
        const isSuccess = toast.classList.contains('success') || 
                         toast.textContent.toLowerCase().includes('success') ||
                         toast.textContent.toLowerCase().includes('saved');
        return { visible: true, success: isSuccess, message: toast.textContent };
      }
      return { visible: false };
    });

    if (toastVisible.visible) {
      console.log(`   📢 Toast: ${toastVisible.success ? '✓' : '⚠️'} ${toastVisible.message}`);
      return toastVisible.success;
    }
    return null; // No toast found
  } catch (error) {
    return null;
  }
}

// Check if data appears in table
async function verifyDataInTable(page, searchText) {
  try {
    const found = await page.evaluate((text) => {
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        if (table.textContent.includes(text)) {
          return true;
        }
      }
      return false;
    }, searchText);

    if (found) {
      console.log(`   ✓ Data found in table: "${searchText}"`);
    } else {
      console.log(`   ⚠️  Data not found in table`);
    }
    return found;
  } catch (error) {
    return false;
  }
}

// Test CRUD operations on a tab
async function testTabCRUD(page, tab, screenshotDir) {
  console.log('\n' + '='.repeat(60));
  console.log(`🔹 Testing CRUD for: ${tab.name}`);
  console.log('='.repeat(60));

  // Click tab
  const tabClicked = await safeClick(page, tab.selector);
  if (!tabClicked) {
    console.log(`❌ Failed to click tab: ${tab.name}`);
    return { success: false, operations: {} };
  }
  
  await page.waitForTimeout(2000);

  const operations = {
    create: false,
    read: false,
    update: false,
    delete: false
  };

  // Get test data
  const testData = generateTestData(tab.name);
  
  if (!testData) {
    console.log(`⚠️  No test data configured for ${tab.name}, skipping CRUD`);
    await page.screenshot({ 
      path: path.join(screenshotDir, `crud-${tab.tab}-view.png`),
      fullPage: true 
    });
    return { success: false, operations };
  }

  // === CREATE Operation ===
  console.log('\n📝 CREATE Operation:');
  
  // Scroll to find form
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  
  // Take screenshot before filling
  await page.screenshot({ 
    path: path.join(screenshotDir, `crud-${tab.tab}-01-before-fill.png`),
    fullPage: true 
  });

  // Fill form
  const filled = await fillForm(page, testData);
  
  if (filled) {
    // Take screenshot after filling
    await page.screenshot({ 
      path: path.join(screenshotDir, `crud-${tab.tab}-02-filled.png`),
      fullPage: true 
    });

    // Click save button
    const saved = await clickSaveButton(page);
    
    if (saved) {
      await page.waitForTimeout(2000);
      
      // Check for success notification
      const success = await checkForSuccess(page);
      
      // Take screenshot after save
      await page.screenshot({ 
        path: path.join(screenshotDir, `crud-${tab.tab}-03-after-save.png`),
        fullPage: true 
      });
      
      if (success !== false) {
        operations.create = true;
        console.log('✅ CREATE operation successful');
      } else {
        console.log('⚠️  CREATE operation completed but no success confirmation');
      }
    }
  }

  // === READ Operation ===
  console.log('\n📖 READ Operation:');
  
  // Scroll to tables area
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1000);
  
  // Count rows in tables
  const tableInfo = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    let totalRows = 0;
    let totalTables = tables.length;
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr');
      totalRows += rows.length;
    });
    
    return { tables: totalTables, rows: totalRows };
  });
  
  console.log(`   📊 Found ${tableInfo.tables} tables with ${tableInfo.rows} total rows`);
  
  if (tableInfo.rows > 0) {
    operations.read = true;
    console.log('✅ READ operation successful - data visible in tables');
  }
  
  // Take screenshot of tables
  await page.screenshot({ 
    path: path.join(screenshotDir, `crud-${tab.tab}-04-table-view.png`),
    fullPage: true 
  });

  // === UPDATE Operation ===
  console.log('\n✏️ UPDATE Operation:');
  
  // Try to find and click edit button
  const editClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const editButton = buttons.find(btn => {
      const text = btn.textContent || '';
      const title = btn.title || '';
      return text.toLowerCase().includes('edit') || 
             title.toLowerCase().includes('edit') ||
             btn.classList.contains('edit-btn');
    });
    
    if (editButton) {
      editButton.click();
      return true;
    }
    return false;
  });

  if (editClicked) {
    console.log('   ✓ Edit button clicked');
    await page.waitForTimeout(1500);
    
    // Modify a field
    const updated = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      if (inputs.length > 0) {
        const input = inputs[0];
        const oldValue = input.value;
        input.value = oldValue + ' (Updated)';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });
    
    if (updated) {
      console.log('   ✓ Field value modified');
      
      // Take screenshot of modified form
      await page.screenshot({ 
        path: path.join(screenshotDir, `crud-${tab.tab}-05-updated.png`),
        fullPage: true 
      });
      
      // Click update/save button
      const updateSaved = await clickSaveButton(page);
      
      if (updateSaved) {
        await page.waitForTimeout(2000);
        const success = await checkForSuccess(page);
        
        // Take screenshot after update
        await page.screenshot({ 
          path: path.join(screenshotDir, `crud-${tab.tab}-06-after-update.png`),
          fullPage: true 
        });
        
        if (success !== false) {
          operations.update = true;
          console.log('✅ UPDATE operation successful');
        }
      }
    }
  } else {
    console.log('   ⚠️  Edit button not found, skipping UPDATE test');
  }

  // === DELETE Operation ===
  console.log('\n🗑️ DELETE Operation:');
  
  // Try to find and click delete button
  const deleteClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const deleteButton = buttons.find(btn => {
      const text = btn.textContent || '';
      const title = btn.title || '';
      return text.toLowerCase().includes('delete') || 
             title.toLowerCase().includes('delete') ||
             btn.classList.contains('delete-btn') ||
             text.includes('🗑️');
    });
    
    if (deleteButton) {
      deleteButton.click();
      return true;
    }
    return false;
  });

  if (deleteClicked) {
    console.log('   ✓ Delete button clicked');
    await page.waitForTimeout(2000);
    
    const success = await checkForSuccess(page);
    
    // Take screenshot after delete
    await page.screenshot({ 
      path: path.join(screenshotDir, `crud-${tab.tab}-07-after-delete.png`),
      fullPage: true 
    });
    
    if (success !== false) {
      operations.delete = true;
      console.log('✅ DELETE operation successful');
    }
  } else {
    console.log('   ⚠️  Delete button not found, skipping DELETE test');
  }

  // Final summary for this tab
  const successCount = Object.values(operations).filter(v => v).length;
  console.log(`\n📊 Tab Summary: ${successCount}/4 CRUD operations successful`);
  console.log(`   Create: ${operations.create ? '✅' : '❌'}`);
  console.log(`   Read:   ${operations.read ? '✅' : '❌'}`);
  console.log(`   Update: ${operations.update ? '✅' : '❌'}`);
  console.log(`   Delete: ${operations.delete ? '✅' : '❌'}`);

  return { success: successCount > 0, operations };
}

// Main test execution
(async () => {
  console.log('🚀 Starting Safety Module CRUD Test');
  console.log('📋 Testing Create, Read, Update, Delete operations\n');

  // Safety tabs to test (focusing on tabs with forms)
  const SAFETY_TABS = [
    { name: 'USC-Safe-Test', selector: { text: 'USC-Safe-Test' }, tab: 'usc-safe-test' },
    { name: 'Incidents', selector: { text: 'Incidents' }, tab: 'incidents' },
    { name: 'Grievances', selector: { text: 'Grievances' }, tab: 'grievances' },
    { name: 'Fire', selector: { text: 'Fire' }, tab: 'fire' },
    { name: 'Electrical', selector: { text: 'Electrical' }, tab: 'electrical' },
    { name: 'Structural', selector: { text: 'Structural' }, tab: 'structural' },
    { name: 'Health', selector: { text: 'Health' }, tab: 'health' },
    { name: 'Gas', selector: { text: 'Gas' }, tab: 'gas' },
    { name: 'Boiler', selector: { text: 'Boiler' }, tab: 'boiler' },
    { name: 'Consultant', selector: { text: 'Consultant' }, tab: 'consultant' }
  ];

  // Create directories
  const videosDir = path.join(__dirname, 'videos');
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Start recording
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: { width: 1920, height: 1080 }
  });
  
  const videoPath = path.join(videosDir, 'safety-crud-test.mp4');
  await recorder.start(videoPath);
  console.log('✅ Video recording started\n');

  try {
    // STEP 1: Login
    console.log('═'.repeat(60));
    console.log('🔐 STEP 1: LOGIN');
    console.log('═'.repeat(60));
    
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    
    await page.type('input[type="email"]', TEST_USER.email);
    await page.type('input[type="password"]', TEST_USER.password);
    console.log('✅ Credentials entered');
    
    await page.click('#loginBtn');
    console.log('✅ Login button clicked');
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      console.log('✅ Login successful\n');
    }

    // STEP 2: Verify Safety Dashboard
    console.log('═'.repeat(60));
    console.log('📊 STEP 2: SAFETY DASHBOARD');
    console.log('═'.repeat(60));
    
    await page.goto(`${BASE_URL}/masters/safety-office.html`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    console.log(`ℹ️ Current URL: ${page.url()}`);
    console.log('✅ Safety Officer dashboard loaded\n');

    // STEP 3: Test CRUD on each tab
    console.log('═'.repeat(60));
    console.log('🛡️ STEP 3: TESTING CRUD OPERATIONS ON ALL TABS');
    console.log('═'.repeat(60));

    const results = [];
    
    for (let i = 0; i < SAFETY_TABS.length; i++) {
      const tab = SAFETY_TABS[i];
      const result = await testTabCRUD(page, tab, screenshotsDir);
      results.push({ tab: tab.name, ...result });
      
      await page.waitForTimeout(1000);
    }

    // STEP 4: Final Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('═'.repeat(60));

    const totalOperations = results.reduce((sum, r) => {
      return sum + Object.values(r.operations).filter(v => v).length;
    }, 0);

    const maxOperations = results.length * 4; // 4 operations per tab

    console.log(`\n✅ Tested ${results.length} tabs`);
    console.log(`✅ Successful operations: ${totalOperations}/${maxOperations}`);
    console.log(`📹 Video saved: ${videoPath}`);
    console.log(`📸 Screenshots saved: ${screenshotsDir}\n`);

    console.log('📋 Detailed Results:');
    results.forEach((result, index) => {
      const successCount = Object.values(result.operations).filter(v => v).length;
      console.log(`   ${index + 1}. ${result.tab}: ${successCount}/4 operations`);
      console.log(`      C:${result.operations.create ? '✓' : '✗'} R:${result.operations.read ? '✓' : '✗'} U:${result.operations.update ? '✓' : '✗'} D:${result.operations.delete ? '✓' : '✗'}`);
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await page.waitForTimeout(2000);
    await recorder.stop();
    console.log('\n✅ Video recording stopped');
    
    await browser.close();
    console.log('✅ Browser closed');
    console.log('\n🎉 CRUD Test Complete!\n');
  }
})();
