# Quick Start Guide for Video Testing

## 🎬 AUTOMATED VIDEO TESTING IS NOW RUNNING!

The browser automation has started. Here's what's happening:

### Current Status:
✅ Puppeteer installed
✅ Server running on http://localhost:3000
✅ Browser automation started
✅ Taking screenshots at each step

### What You'll See:

1. **Browser Window Opens** - A Chrome browser will open automatically
2. **Auto Login** - Email and password will type automatically
3. **2FA Prompt** - You'll need to enter your Google Authenticator code when prompted
4. **Module Navigation** - The script will automatically navigate through:
   - CRM (adding contacts)
   - HR (adding employees)
   - Accounting (viewing dashboards)
   - Safety (fire safety forms, audits)
5. **Screenshots Captured** - 19 screenshots will be saved in `tests/screenshots/`

### Next Steps:

#### After the test completes:

```powershell
# View the screenshots
explorer tests\screenshots

# Create video from screenshots
.\tests\create-video.ps1

# Or create video with custom speed
.\tests\create-video.ps1 -FrameRate 1.0   # Slower (1 sec per screenshot)
.\tests\create-video.ps1 -FrameRate 2.0   # Faster (2 screenshots per sec)
```

### Alternative: Direct Screen Recording

For real-time video recording (no screenshot compilation needed):

```powershell
node tests/screen-recorder.js
```

This creates an MP4 video directly at `tests/recordings/test-recording-[timestamp].mp4`

## 📋 Monitoring Progress

Open another PowerShell window to monitor:

```powershell
# Watch screenshot directory
Get-ChildItem tests\screenshots -Name | Measure-Object | Select-Object Count

# Check current step
Get-Content tests\screenshots\*.png | Select-Object -Last 1
```

## 🎯 What Gets Recorded

### Role: Safety Officer (with Owner permissions)

The video demonstrates:

1. **Authentication Flow**
   - Email/password login
   - 2FA with Google Authenticator
   - Session establishment

2. **CRM Module**
   - Contact list
   - Add new contact (John Doe)
   - Auto-fill form fields
   - Save contact

3. **HR Module**
   - Employee list
   - Add new employee (Jane Smith)
   - Position assignment
   - Save employee

4. **Accounting Module**
   - Dashboard overview
   - Chart of accounts
   - Financial metrics

5. **Safety Module**
   - Fire safety audit form
   - Auto-fill factory details
   - Contact person info
   - Save audit
   - View audits list
   - Certification verification

## ⏱️ Timeline

- **Total Duration**: ~2-3 minutes for screenshots
- **Video Length**: ~38 seconds (at 0.5 fps default)
- **Screenshot Count**: 19 images
- **Browser Open Time**: 30 seconds at end for review

## 🎥 Video Output

The final video will show:
- Human-like typing (random delays)
- Smooth navigation
- All form fields being filled
- Buttons being clicked
- Page transitions
- Data being saved

## 🔧 Troubleshooting

### If browser doesn't open:
```powershell
# Kill any hanging processes
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Restart server
node src/web-server.js &

# Retry test
node tests/video-test-recorder.js
```

### If 2FA times out:
- Have Google Authenticator app ready
- Enter code quickly when prompted
- Code is valid for 30 seconds

### Check progress:
```powershell
# Count screenshots created so far
(Get-ChildItem tests\screenshots\*.png).Count

# View latest screenshot
Get-ChildItem tests\screenshots\*.png | Sort-Object LastWriteTime | Select-Object -Last 1 | Invoke-Item
```

## 📊 Expected Output Files

```
tests/
├── screenshots/
│   ├── 01-login-page.png
│   ├── 02-login-filled.png
│   ├── 03-2fa-prompt.png
│   ├── 04-2fa-filled.png
│   ├── 05-dashboard.png
│   ├── 06-crm-page.png
│   ├── 07-crm-contact-form.png
│   ├── 08-crm-contact-saved.png
│   ├── 09-hr-employees.png
│   ├── 10-hr-employee-form.png
│   ├── 11-hr-employee-saved.png
│   ├── 12-accounting-dashboard.png
│   ├── 13-accounting-chart.png
│   ├── 14-safety-fire-form.png
│   ├── 15-safety-fire-form-filled.png
│   ├── 16-safety-fire-saved.png
│   ├── 17-safety-audits-list.png
│   ├── 18-audit-certification.png
│   └── 19-final-dashboard.png
└── recordings/
    └── test-recording.mp4
```

## 🎬 Creating the Final Video

Once screenshots are complete:

```powershell
# Standard video (0.5 seconds per frame = 38 second video)
.\tests\create-video.ps1

# Slower video (1 second per frame = 19 second video)  
.\tests\create-video.ps1 -FrameRate 1.0

# Very slow (2 seconds per frame = 9.5 second video)
.\tests\create-video.ps1 -FrameRate 0.5

# Fast (2 frames per second = 9.5 second video)
.\tests\create-video.ps1 -FrameRate 2.0
```

The script will:
1. Check for FFmpeg (install if needed)
2. Compile screenshots into MP4
3. Apply smooth scaling and transitions
4. Automatically open the video

## 🎯 Next Steps for Role-Based Testing

To test other roles, edit `tests/video-test-recorder.js`:

```javascript
// Test as Owner
const TEST_USER = {
  email: 'owner@demo.example',
  password: 'DemoPass123!'
};

// Test as HR Manager (if exists)
const TEST_USER = {
  email: 'hr@demo.example',
  password: 'HRPass123!'
};
```

Then run again to see different permissions and access levels!
