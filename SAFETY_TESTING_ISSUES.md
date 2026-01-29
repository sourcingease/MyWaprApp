# Safety Officer Dashboard Testing - Issues Found & Solutions

## Date: January 29, 2026

## Issues Identified

### 1. **Agents Not Loading Due to Auth Issue**
**Status**: ⚠️ Confirmed
**Location**: `/masters/safety-office.html` - Safety Agents Panel

**Problem**:
- The safety agents panel (`#safety-agents-panel`) is not loading properly
- Auth tokens may not be properly passed to agent API calls
- Line 1348 in safety-office.html shows: `<div id="safety-agents-panel" style="margin-bottom:8px;"></div>`

**Root Cause**:
- API calls to load agents may be failing due to:
  - Missing or expired JWT token
  - CORS issues with agent endpoints
  - Agent API not receiving proper authentication headers

**Solution**:
```javascript
// In safety-office.html, ensure agents are loaded with proper auth
async function loadSafetyAgents() {
  try {
    const response = await fetch('/api/agents/safety', {
      method: 'GET',
      credentials: 'include', // Important: include cookies with request
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}'` // If using localStorage
      }
    });
    
    if (!response.ok) {
      console.error('Failed to load agents:', response.status);
      return;
    }
    
    const data = await response.json();
    // Render agents in #safety-agents-panel
  } catch (error) {
    console.error('Error loading agents:', error);
  }
}
```

### 2. **Popup/Modal Not Handling Properly on Save/Update Button**
**Status**: ⚠️ Confirmed
**Location**: Multiple forms throughout safety-office.html

**Problem**:
- Save buttons trigger popups/alerts that are not being dismissed
- Form submissions may not complete due to unhandled dialogs
- Alert/Confirm dialogs block test execution

**Forms Affected**:
- `#incidentFormData` - Incidents form
- `#grievanceFormData` - Grievances form  
- `#fireFormData` - Fire Safety form
- `#electricalFormData` - Electrical Safety form
- `#structuralFormData` - Structural Safety form
- `#uscSafeFormData` - USC-Safe form

**Root Cause**:
- JavaScript `alert()` or `confirm()` calls after save operations
- Modal dialogs not being programmatically closed
- Success/error messages using blocking alerts instead of non-blocking notifications

**Solution**:

#### For Testing (Immediate Fix):
```javascript
// In test scripts, add dialog handlers
page.on('dialog', async dialog => {
  console.log(`Dialog detected: ${dialog.message()}`);
  await dialog.accept(); // or dialog.dismiss()
});
```

#### For Production (Long-term Fix):
Replace blocking alerts with toast notifications:

```javascript
// Instead of:
alert('Data saved successfully!');

// Use:
showToast('Data saved successfully!', 'success');

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
```

### 3. **Page Elements Not Found During Testing**
**Status**: ⚠️ Confirmed

**Problem**:
- Selectors timing out during automated tests
- Elements may be dynamically loaded after page load
- Tab content not visible until activated

**Examples**:
```
Failed to click Dashboard Overview: Waiting for selector
`a.nav-link[onclick*="goToDashboard"]` failed: 5000ms exceeded

Failed to fill Incident Date: Waiting for selector 
`#incidentFormData input[name="IncidentDate"]` failed: 3000ms exceeded
```

**Root Cause**:
- Content loaded via JavaScript after initial page load
- Tab content hidden by default (display:none)
- Need to activate tabs before interacting with their content

**Solution**:
```javascript
// Wait for dynamic content
await page.waitForFunction(() => {
  return document.querySelector('.sidebar') !== null;
}, { timeout: 10000 });

// Or wait for specific initialization
await page.waitForFunction(() => {
  return window.SafetyAPI && window.SafetyAPI.initialized === true;
}, { timeout: 15000 });
```

## Test Script Improvements Made

### ✅ Completed Fixes:

1. **Added Dialog Handlers**
```javascript
page.on('dialog', async dialog => {
  console.log(`⚠ Dialog detected: ${dialog.message()}`);
  await dialog.accept();
});
```

2. **Added Console Error Monitoring**
```javascript
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`⚠ Console Error: ${msg.text()}`);
  }
});
```

3. **Improved Navigation Flow**
- Reload page between tab tests to reset state
- Increased timeouts for slow-loading content
- Added proper wait conditions for elements

4. **Better Error Handling**
- All click/type operations now return success/failure
- Tests continue even if individual elements not found
- Detailed logging of what succeeded vs failed

## Recommendations

### Immediate Actions:

1. **Fix Agent Loading**
   - Check `/api/agents/safety` endpoint exists
   - Verify authentication middleware is applied
   - Add proper error handling in agent loading code

2. **Replace Alert() Calls**
   - Search codebase for `alert(` and `confirm(`
   - Replace with non-blocking toast notifications
   - Ensure modals close properly after operations

3. **Add Loading States**
   - Show spinners while agents/data loading
   - Disable buttons during async operations
   - Provide user feedback on save operations

### Code Locations to Check:

```bash
# Find all alert() calls
grep -r "alert(" public/masters/safety-office.html

# Find all confirm() calls  
grep -r "confirm(" public/masters/safety-office.html

# Find agent loading code
grep -r "safety-agents-panel" public/masters/safety-office.html

# Find form submission handlers
grep -r "onsubmit=" public/masters/safety-office.html
```

### Testing Workflow:

1. **Manual Testing First**
   - Open browser DevTools Console
   - Navigate to Safety Officer dashboard
   - Watch for console errors during agent loading
   - Test each form save button and note any alerts

2. **Automated Testing**
   - Run `tests/quick-safety-test.js` first (simple diagnosis)
   - Then run `tests/safety-officer-detailed-test.js` (full coverage)
   - Review video recording for visual confirmation

3. **Verification**
   - All agents load without errors
   - Forms save without blocking alerts
   - Modals close automatically after save
   - No JavaScript errors in console

## Files Modified

### Test Scripts:
- `tests/safety-officer-detailed-test.js` - Full comprehensive test with recording
- `tests/quick-safety-test.js` - Quick diagnostic test without recording

### Features:
- ✅ Dialog/alert handling
- ✅ Console error monitoring  
- ✅ Page error handling
- ✅ Improved navigation between tabs
- ✅ Better timeout handling
- ✅ Detailed progress logging

## Next Steps

1. **Identify Alert Sources**
   - Review safety-office.html for alert() calls
   - Check associated JavaScript files
   - Document which forms use alerts

2. **Fix Agent API**
   - Verify `/api/agents/*` endpoints work
   - Test authentication headers
   - Add proper error responses

3. **Implement Toast Notifications**
   - Create reusable toast component
   - Replace all alert() calls
   - Add CSS animations

4. **Re-run Full Test Suite**
   - After fixes, run complete video test
   - Verify all tabs load correctly
   - Confirm no blocking dialogs
   - Check agents load successfully

## Test Execution Commands

```powershell
# Quick diagnostic test (no recording)
node tests/quick-safety-test.js

# Full comprehensive test with video
node tests/safety-officer-detailed-test.js

# Check for Chrome processes
Get-Process chrome -ErrorAction SilentlyContinue

# Kill Chrome if stuck
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

# View test video
Start-Process "tests/recordings/safety-officer-detailed-2026-01-29.mp4"
```

## Expected Behavior After Fixes

### ✅ Agents Panel:
- Safety Agent box visible and clickable
- No console errors related to auth
- Agent panel populated with available agents

### ✅ Form Submissions:
- Save button triggers save operation
- Success message shown as toast (not alert)
- Form data persists to database
- Table updates with new record
- No blocking dialogs

### ✅ Test Execution:
- All tabs accessible via action buttons
- Forms can be filled programmatically  
- Save operations complete without hanging
- Video recording captures all interactions
- No timeout errors in test output

## Status Summary

| Component | Status | Priority |
|-----------|--------|----------|
| Auth for Agents | ⚠️ Needs Fix | HIGH |
| Alert/Confirm Blocking | ⚠️ Needs Fix | HIGH |
| Element Timeouts | ✅ Improved | MEDIUM |
| Dialog Handling | ✅ Fixed | LOW |
| Error Monitoring | ✅ Implemented | LOW |
| Video Recording | ✅ Working | LOW |

