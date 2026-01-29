/**
 * Advanced Screen Recording with Puppeteer
 * Records actual video while testing (requires puppeteer-screen-recorder)
 */

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'safety@demo.example',
  password: 'Welcome123!'
};

const RECORDING_PATH = path.join(__dirname, 'recordings');
if (!fs.existsSync(RECORDING_PATH)) fs.mkdirSync(RECORDING_PATH, { recursive: true });

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function humanType(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
  const element = await page.$(selector);
  if (!element) return;
  
  await page.click(selector);
  await delay(300);
  for (const char of text) {
    await page.type(selector, char);
    await delay(50 + Math.random() * 100);
  }
}

async function recordTest() {
  console.log('🎬 Starting Screen Recording Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--window-size=1920,1080',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 30,
    videoFrame: {
      width: 1920,
      height: 1080
    },
    aspectRatio: '16:9',
  });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const videoPath = path.join(RECORDING_PATH, `test-recording-${timestamp}.mp4`);
  
  try {
    console.log('🔴 Starting recording...');
    await recorder.start(videoPath);
    
    // Login
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0' });
    await delay(2000);
    
    await humanType(page, '#email', TEST_USER.email);
    await delay(500);
    await humanType(page, '#password', TEST_USER.password);
    await delay(500);
    
    await page.click('#loginBtn');
    await delay(2000);
    
    // 2FA
    console.log('🔒 2FA Required');
    const tfaCode = await askQuestion('Enter 6-digit code: ');
    await humanType(page, '#otpCode', tfaCode);
    await delay(500);
    await page.click('#verifyBtn');
    await delay(3000);
    
    console.log('✅ Logged in successfully');
    
    // Navigate through modules
    const modules = [
      { name: 'Dashboard', url: '/dashboard.html' },
      { name: 'CRM', url: '/crm.html' },
      { name: 'Employees', url: '/employees.html' },
      { name: 'Accounting', url: '/accounting/dashboard.html' },
      { name: 'Safety Audits', url: '/safety-audits.html' },
      { name: 'Fire Safety', url: '/test-fire-form.html' },
      { name: 'Certification', url: '/audit-verification.html' }
    ];
    
    for (const module of modules) {
      console.log(`📄 Opening ${module.name}...`);
      await page.goto(`${BASE_URL}${module.url}`, { waitUntil: 'networkidle0' });
      await delay(3000);
      
      // Scroll to show content
      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      await delay(1000);
      
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
      });
      await delay(1000);
    }
    
    console.log('⏸️  Keeping browser open for 10 seconds...');
    await delay(10000);
    
    console.log('⏹️  Stopping recording...');
    await recorder.stop();
    
    console.log(`✅ Recording saved: ${videoPath}`);
    console.log('\n🎥 Video file ready for viewing!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await recorder.stop();
  } finally {
    await browser.close();
  }
}

recordTest().catch(console.error);
