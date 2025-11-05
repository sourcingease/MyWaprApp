# Fire Safety Form - Testing Instructions

## Changes Made

### 1. **Fixed Form Submission**
- Added `method="post"` and `action=""` to prevent GET submission
- Added `return false;` to onsubmit handler to prevent default form behavior
- Form now properly calls `saveFireSafety(event)` JavaScript function

### 2. **Database Persistence**
- Updated `saveFireSafety()` function to save to database via API (`POST /api/safety/fire`)
- Updated API endpoint to accept `formData` parameter
- Data is stored in `SafetyFireSafety` table
- Form values are NOT reset after save (they remain visible)

### 3. **Auto-Load Saved Data**
- Added `loadFireSafetyData()` function
- Automatically loads most recent saved data when switching to Fire Safety tab
- Properly populates radio buttons, checkboxes, and text inputs

### 4. **Default Radio Button Selection**
- Added `setDefaultRadioButtons()` utility function
- All radio buttons now default to the last option (usually "N/A")
- Applied to ALL forms on page load
- Also applied after form reset

## Testing Steps

### Step 1: Start the Server
```powershell
node src/web-server.js
```

### Step 2: Open the Page
Navigate to: http://localhost:3000/masters/safety-office.html

### Step 3: Test Default Values
1. Click on "Fire Safety" tab
2. **Verify**: All radio buttons should have "N/A" selected by default
3. Scroll through the form - all radio groups should have a selection

### Step 4: Test Form Saving
1. Change some radio buttons (e.g., "Smoking prohibited" to "Yes")
2. Change a few more fields
3. Click **"💾 Save"** button
4. **Verify**: You should see "✅ Fire safety data saved successfully!" alert
5. **Verify**: The form values should REMAIN VISIBLE (not cleared)
6. **Verify**: The URL should NOT change (no query parameters)

### Step 5: Test Data Persistence
1. Click on another tab (e.g., "Dashboard")
2. Click back on "Fire Safety" tab
3. **Verify**: Your saved values should still be there
4. Check browser console (F12) - you should see: "Fire safety data loaded successfully"

### Step 6: Test Reset Button
1. Fill in some values
2. Click **"🔄 Reset"** button
3. **Verify**: Form is cleared
4. **Verify**: All radio buttons default back to "N/A"

### Step 7: Test Database Persistence
1. Fill in the form and save
2. Close your browser completely
3. Reopen: http://localhost:3000/masters/safety-office.html
4. Click on "Fire Safety" tab
5. **Verify**: Your saved data should load automatically

## Troubleshooting

### Issue: Data Not Saving
**Check:**
- Browser console (F12) for errors
- Network tab to see if POST request to `/api/safety/fire` is being made
- Server console for any error messages

**Solution:**
- Make sure server is running: `node src/web-server.js`
- Check that `SafetyFireSafety` table exists in database

### Issue: URL Still Has Query Parameters
**Check:**
- Make sure you're not pressing Enter in a form field (which triggers default submission)
- Click the Save button with the mouse

**Solution:**
- The form now has `onsubmit="saveFireSafety(event); return false;"` which prevents default

### Issue: Radio Buttons Not Defaulting to N/A
**Check:**
- Browser console for JavaScript errors
- Make sure `setDefaultRadioButtons()` function is defined

**Solution:**
- Refresh the page (Ctrl+F5) to clear cache
- Check that the DOMContentLoaded event is firing

## Database Schema

The data is saved to `SafetyFireSafety` table with this structure:
```sql
CREATE TABLE SafetyFireSafety (
  Id INT PRIMARY KEY IDENTITY(1,1),
  TenantId INT NOT NULL,
  FormData NVARCHAR(MAX),  -- Stores JSON of all form fields
  CreatedBy NVARCHAR(256),
  CreatedDate DATETIME DEFAULT GETDATE(),
  UpdatedDate DATETIME DEFAULT GETDATE()
)
```

## API Endpoints

### Save Fire Safety Data
```
POST /api/safety/fire
Content-Type: application/json

{
  "formData": {
    "smokingProhibited": "Yes",
    "noSmokingSigns": "Yes",
    // ... all other form fields
  }
}
```

### Load Fire Safety Data
```
GET /api/safety/fire

Response:
{
  "success": true,
  "data": [
    {
      "Id": 1,
      "FormData": "{\"smokingProhibited\":\"Yes\", ...}",
      "CreatedDate": "2025-10-25T15:00:00",
      ...
    }
  ]
}
```

## Notes

- Data is saved with TenantId = 1 by default (modify if you have multi-tenancy)
- Only the most recent record is loaded when opening the tab
- All radio buttons default to the LAST option (index -1), which is typically "N/A"
- The same pattern applies to all other safety forms (Electrical, Structural, etc.)
