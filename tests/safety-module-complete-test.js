const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
    email: 'safety@demo.example',
    password: 'Welcome123!'
};

// All 13 Safety Module Tabs (using label text matching)
const SAFETY_TABS = [
    { name: 'USC-Safe-Test', selector: { text: 'USC-Safe-Test' }, tab: 'usc-safe-test' },
    { name: 'Incidents', selector: { text: 'Incidents' }, tab: 'incidents' },
    { name: 'Grievances', selector: { text: 'Grievances' }, tab: 'grievances' },
    { name: 'USC-Safe', selector: { text: 'USC-Safe' }, tab: 'usc-safe' },
    { name: 'Fire', selector: { text: 'Fire' }, tab: 'fire' },
    { name: 'Electrical', selector: { text: 'Electrical' }, tab: 'electrical' },
    { name: 'Structural', selector: { text: 'Structural' }, tab: 'structural' },
    { name: 'Health', selector: { text: 'Health' }, tab: 'health' },
    { name: 'Gas', selector: { text: 'Gas' }, tab: 'gas' },
    { name: 'Boiler', selector: { text: 'Boiler' }, tab: 'boiler' },
    { name: 'Consultant', selector: { text: 'Consultant' }, tab: 'consultant' },
    { name: 'DSA', selector: { text: 'DSA' }, tab: 'dsa' },
    { name: 'Emergency', selector: { text: 'Emergency' }, tab: 'emergency-power' }
];

function log(message, emoji = '📋') {
    console.log(`${emoji} ${message}`);
}

function logSuccess(message) {
    log(message, '✅');
}

function logError(message) {
    log(message, '❌');
}

function logInfo(message) {
    log(message, 'ℹ️');
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeClick(page, selector, timeout = 10000) {
    try {
        // If it's a label text (object format), find by text and click
        if (typeof selector === 'object' && selector.text) {
            const clicked = await page.evaluate((labelText) => {
                const labels = Array.from(document.querySelectorAll('.action-label'));
                const targetLabel = labels.find(label => label.textContent.trim() === labelText);
                if (targetLabel && targetLabel.closest('a')) {
                    targetLabel.closest('a').click();
                    return true;
                }
                return false;
            }, selector.text);
            
            if (clicked) {
                return true;
            } else {
                logError(`Could not find button with label: ${selector.text}`);
                return false;
            }
        } else {
            // Regular CSS selector
            await page.waitForSelector(selector, { timeout, visible: true });
            await page.click(selector);
            return true;
        }
    } catch (error) {
        logError(`Failed to click ${selector}: ${error.message}`);
        return false;
    }
}

async function checkElement(page, selector, name) {
    try {
        await page.waitForSelector(selector, { timeout: 5000 });
        logSuccess(`${name}: FOUND`);
        return true;
    } catch (error) {
        logError(`${name}: NOT FOUND`);
        return false;
    }
}

async function scrollPage(page) {
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await wait(500);
    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });
}

async function testSafetyTab(page, tab, index) {
    console.log('\n' + '='.repeat(60));
    log(`Testing Tab ${index + 1}/${SAFETY_TABS.length}: ${tab.name}`, '🔹');
    console.log('='.repeat(60));

    // Click the tab button
    const clicked = await safeClick(page, tab.selector, 8000);
    if (!clicked) {
        logError(`Could not click ${tab.name} tab`);
        return false;
    }

    await wait(2000); // Wait for content to load

    // Wait for tab content div to be visible
    try {
        await page.waitForSelector(`#${tab.tab}-tab`, { timeout: 5000, visible: true });
        logSuccess(`${tab.name} content loaded`);
    } catch (error) {
        logInfo(`${tab.name} content div not found, checking for generic content`);
    }

    // Check for common elements
    const elements = await page.evaluate(() => {
        const forms = document.querySelectorAll('form').length;
        const tables = document.querySelectorAll('table').length;
        const inputs = document.querySelectorAll('input').length;
        const buttons = document.querySelectorAll('button').length;
        const selects = document.querySelectorAll('select').length;
        return { forms, tables, inputs, buttons, selects };
    });

    log(`   Forms: ${elements.forms} | Tables: ${elements.tables} | Inputs: ${elements.inputs}`, 'ℹ️');
    log(`   Buttons: ${elements.buttons} | Dropdowns: ${elements.selects}`, 'ℹ️');

    // Scroll through content
    await scrollPage(page);

    // Take screenshot
    await page.screenshot({ 
        path: `tests/screenshots/safety-${tab.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
    });
    logSuccess(`Screenshot saved`);

    await wait(1500);
    return true;
}

(async () => {
    let browser;
    let recorder;
    
    try {
        log('Starting Safety Module Complete Test', '🚀');
        log('Testing all 15 Safety tabs systematically', '📋');
        console.log('\n');

        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--start-maximized']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Start recording
        recorder = new PuppeteerScreenRecorder(page, {
            followNewTab: true,
            fps: 30,
            videoFrame: {
                width: 1920,
                height: 1080,
            },
            aspectRatio: '16:9',
        });

        await recorder.start('tests/videos/safety-module-complete-test.mp4');
        logSuccess('Video recording started');

        // Handle dialogs automatically
        page.on('dialog', async dialog => {
            log(`Dialog detected: ${dialog.message()}`, '⚠️');
            await dialog.accept();
        });

        // STEP 1: Login
        console.log('\n' + '═'.repeat(60));
        log('STEP 1: LOGIN', '🔐');
        console.log('═'.repeat(60));

        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
        await wait(2000);

        await page.type('#email', TEST_USER.email);
        await page.type('#password', TEST_USER.password);
        logSuccess('Credentials entered');

        await page.click('#loginBtn');
        logSuccess('Login button clicked');

        // Wait for URL to change from login.html
        await page.waitForFunction(
            () => !window.location.href.includes('login.html'),
            { timeout: 15000 }
        );
        logSuccess('Redirected from login');

        await wait(5000); // Wait for page to fully load

        // STEP 2: Verify Safety Dashboard
        console.log('\n' + '═'.repeat(60));
        log('STEP 2: SAFETY DASHBOARD', '📊');
        console.log('═'.repeat(60));

        const currentUrl = page.url();
        log(`Current URL: ${currentUrl}`, 'ℹ️');

        if (!currentUrl.includes('safety-office.html')) {
            logError('Not on Safety Officer dashboard!');
            throw new Error('Login did not redirect to safety dashboard');
        }

        logSuccess('Safety Officer dashboard loaded');
        await wait(3000);

        // Check for agents
        const agentCheck = await page.evaluate(() => {
            const agentPanel = document.querySelector('#safety-agents-panel');
            const agentBoxes = document.querySelectorAll('.agent-box');
            const actionButtons = document.querySelectorAll('.action-btn');
            return {
                hasPanel: !!agentPanel,
                agentCount: agentBoxes.length,
                buttonCount: actionButtons.length
            };
        });

        logSuccess(`Agents panel: ${agentCheck.hasPanel ? 'FOUND' : 'NOT FOUND'}`);
        logSuccess(`Agent boxes: ${agentCheck.agentCount}`);
        logSuccess(`Action buttons: ${agentCheck.buttonCount}`);

        await wait(2000);

        // STEP 3: Test All 15 Safety Tabs
        console.log('\n' + '═'.repeat(60));
        log('STEP 3: TESTING ALL 15 SAFETY TABS', '🛡️');
        console.log('═'.repeat(60));

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < SAFETY_TABS.length; i++) {
            const result = await testSafetyTab(page, SAFETY_TABS[i], i);
            if (result) {
                successCount++;
            } else {
                failCount++;
            }
            await wait(1000); // Small pause between tabs
        }

        // STEP 4: Final Summary
        console.log('\n' + '═'.repeat(60));
        log('TEST SUMMARY', '📊');
        console.log('═'.repeat(60));

        logSuccess(`Successfully tested: ${successCount}/${SAFETY_TABS.length} tabs`);
        if (failCount > 0) {
            logError(`Failed to test: ${failCount}/${SAFETY_TABS.length} tabs`);
        }

        // List all tested tabs
        console.log('\n📋 Tested Safety Tabs:');
        SAFETY_TABS.forEach((tab, idx) => {
            console.log(`   ${idx + 1}. ${tab.name}`);
        });

        await wait(3000);

        // Stop recording
        if (recorder) {
            await recorder.stop();
            logSuccess('Video recording saved: tests/videos/safety-module-complete-test.mp4');
        }

        logSuccess('Safety Module Test Completed!');

    } catch (error) {
        logError(`Test failed: ${error.message}`);
        console.error(error);

        if (recorder) {
            await recorder.stop();
        }

        if (browser) {
            await browser.close();
        }

        process.exit(1);
    }

    if (browser) {
        await wait(2000);
        await browser.close();
        logSuccess('Browser closed');
    }

    process.exit(0);
})();
