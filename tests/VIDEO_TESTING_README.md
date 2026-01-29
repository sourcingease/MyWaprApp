# 🎬 Video Testing Guide

This guide explains how to create automated video recordings of the ComplytEX testing process.

## 📋 Prerequisites

1. **Node.js** (already installed)
2. **Puppeteer** (for browser automation)
3. **FFmpeg** (for video creation from screenshots)
4. **Puppeteer Screen Recorder** (optional, for direct video recording)

## 🚀 Quick Start

### Method 1: Screenshot-Based Video (Recommended)

This method captures screenshots at each step and creates a video from them.

```powershell
# Install dependencies
npm install puppeteer

# Run the automated test with screenshots
node tests/video-test-recorder.js

# Create video from screenshots (requires FFmpeg)
.\tests\create-video.ps1
```

### Method 2: Direct Screen Recording

This method records the actual screen in real-time.

```powershell
# Install additional dependency
npm install puppeteer-screen-recorder

# Run the screen recorder
node tests/screen-recorder.js
```

## 📦 Installing FFmpeg

### Option 1: Using Chocolatey (Automated)
The `create-video.ps1` script will automatically install FFmpeg if not found.

### Option 2: Manual Installation
1. Download from https://ffmpeg.org/download.html
2. Extract and add to PATH
3. Verify: `ffmpeg -version`

### Option 3: Using Winget
```powershell
winget install ffmpeg
```

## 🎥 What Gets Recorded

The automated video testing shows:

1. **Login Process**
   - Email and password entry
   - 2FA authentication
   - Dashboard loading

2. **CRM Module**
   - Contact list view
   - Adding new contact
   - Form filling and saving

3. **HR Module**
   - Employee list
   - Adding new employee
   - Form submission

4. **Accounting Module**
   - Dashboard overview
   - Chart of accounts
   - Financial data display

5. **Safety Module**
   - Fire safety form
   - Electrical safety
   - Audit creation
   - Safety audits list
   - Certification issuance

## 📁 Output Files

### Screenshots
Location: `tests/screenshots/`
- `01-login-page.png`
- `02-login-filled.png`
- `03-2fa-prompt.png`
- ... (19 total screenshots)

### Videos
Location: `tests/recordings/`
- `test-recording.mp4` (from screenshots)
- `test-recording-[timestamp].mp4` (direct recording)

## ⚙️ Customization

### Adjust Video Speed
Edit `create-video.ps1`:
```powershell
.\create-video.ps1 -FrameRate 1.0  # Slower (1 second per screenshot)
.\create-video.ps1 -FrameRate 2.0  # Faster (2 screenshots per second)
```

### Modify Test Flow
Edit `video-test-recorder.js`:
```javascript
// Add more steps
const formFields = [
  { selector: '#fieldName', value: 'Your Value' },
  // Add more fields
];
```

## 🎯 Role-Based Testing

To test different roles, update the credentials in the script:

```javascript
const TEST_USER = {
  email: 'safety@demo.example',  // Change to different user
  password: 'Welcome123!',
  name: 'Demo Safety Office'
};
```

Available roles to test:
- `owner@demo.example` - Full admin access
- `safety@demo.example` - Safety Officer + Owner
- `hr@demo.example` - HR Manager (if exists)
- `auditor@demo.example` - Safety Auditor (if exists)

## 🐛 Troubleshooting

### Browser Not Opening
- Ensure no other Node processes are running
- Check if port 3000 is accessible
- Try running with `headless: true` for debugging

### 2FA Code Issues
- Have Google Authenticator ready before running
- Code must be entered within 30 seconds
- Check system time is synchronized

### Video Creation Fails
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check screenshots exist in `tests/screenshots/`
- Try manual command:
  ```powershell
  ffmpeg -framerate 0.5 -pattern_type glob -i "tests/screenshots/*.png" -c:v libx264 output.mp4
  ```

### Memory Issues
- Close other applications
- Reduce video resolution in script
- Use screenshot method instead of direct recording

## 📊 Video Quality Settings

Edit `create-video.ps1` for different quality:

```powershell
# High quality (larger file)
-crf 18

# Medium quality (balanced)
-crf 23

# Lower quality (smaller file)
-crf 28
```

## 🎬 Running Complete Test Suite

```powershell
# Full automated workflow
cd tests

# 1. Start server (in separate terminal)
node ../src/web-server.js

# 2. Run video test
node video-test-recorder.js

# 3. Create video
.\create-video.ps1

# 4. Open result
Start-Process recordings/test-recording.mp4
```

## 📝 Notes

- **Server must be running** before starting video test
- **2FA code required** during recording (have phone ready)
- **Recording takes 2-5 minutes** depending on flow
- **Screenshots are preserved** for review
- **Videos are timestamped** to avoid overwriting

## 🔄 Continuous Testing

To run tests repeatedly:

```powershell
# Run test every hour
while ($true) {
  node tests/video-test-recorder.js
  .\tests\create-video.ps1
  Start-Sleep -Seconds 3600
}
```

## 📞 Support

If you encounter issues:
1. Check server is running: `http://localhost:3000`
2. Verify credentials work manually
3. Check console output for error messages
4. Review screenshots in error state
