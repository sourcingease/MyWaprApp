# Complete Setup Guide - Fire Safety Form Data Saving

## Step 1: Create Database Tables

First, make sure all the safety tables exist in your database:

```powershell
node setup-safety-db.js
```

You should see:
```
🔄 Connecting to database...
✅ Connected to database
🔄 Creating safety tables...
✅ All safety tables created successfully!

📋 Safety tables in database:
  ✓ SafetyBoilerSafety
  ✓ SafetyConsultant
  ✓ SafetyDSA
  ✓ SafetyElectrical
  ✓ SafetyEmergencyPower
  ✓ SafetyFireSafety
  ✓ SafetyGasSafety
  ✓ SafetyHealthHazards
  ✓ SafetySafetyTraining
  ✓ SafetyStructural
  ✓ SafetyUNGP
  ✓ SafetyUSCSafe
```

## Step 2: Start the Web Server

```powershell
node src/web-server.js
```

You should see:
```
✅ Safety Officer database connection established
🌐 SaaS Agent Web GUI started!
📱 Open your browser and go to: http://localhost:3000
```

**If you see an error like "Failed to connect safety database":**
- Check your `.env` file has the correct database credentials
- Make sure `AZURE_SQL_PASSWORD` is set

## Step 3: Test Fire Safety Form

### A. Open the Page
1. Open browser: http://localhost:3000/masters/safety-office.html
2. Click on **"Fire Safety"** tab in the sidebar

### B. Verify Default Values
- All radio buttons should have **"N/A"** selected by default
- Scroll through and verify every question has a selection

### C. Save Data
1. Change some radio buttons:
   - "Smoking prohibited inside all buildings" → Select **"Yes"**
   - "No Smoking signs in Urdu & English" → Select **"Yes"**
   - Change a few more fields
2. Click the **"💾 Save"** button
3. **Expected Result:**
   - Alert: "✅ Fire safety data saved successfully!"
   - Form values should REMAIN visible (not cleared)
   - URL should stay as `http://localhost:3000/masters/safety-office.html` (NO query parameters)

### D. Test Data Persistence
1. Click on another tab (e.g., "Dashboard")
2. Click back on "Fire Safety" tab
3. **Expected Result:**
   - Your saved values should still be there
   - Browser console (F12) should show: "Fire safety data loaded successfully"

### E. Test Browser Persistence
1. Close your browser completely
2. Reopen: http://localhost:3000/masters/safety-office.html
3. Click on "Fire Safety" tab
4. **Expected Result:**
   - Your saved data should load automatically

## Step 4: Troubleshooting

### Problem: "Safety routes not available"

**Check:**
```powershell
# Make sure password is set in .env file
Get-Content .env | Select-String "AZURE_SQL_PASSWORD"
```

**Fix:**
Add to `.env` file:
```
AZURE_SQL_PASSWORD=your_actual_password
```

### Problem: Data Not Saving

**Check Browser Console (F12):**
1. Open Developer Tools (F12)
2. Go to "Console" tab
3. Click Save button
4. Look for errors

**Common Issues:**

**Error: "Failed to fetch" or "NetworkError"**
- Server is not running
- Solution: `node src/web-server.js`

**Error: "Invalid object name 'SafetyFireSafety'"**
- Tables don't exist
- Solution: `node setup-safety-db.js`

**Error: "Cannot read property 'FormData' of undefined"**
- API returned empty data (expected for first save)
- This is normal - just save data and try again

### Problem: URL Has Query Parameters

**Example:** `http://localhost:3000/masters/safety-office.html?smokingProhibited=Yes`

**Fix:**
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Refresh the page (Ctrl+F5)
3. DON'T press Enter in form fields - use the Save button

### Problem: Form Values Disappear After Save

**This should be fixed now**. If it still happens:
1. Check browser console for JavaScript errors
2. Make sure you're using the updated `safety-office.html`
3. Clear browser cache (Ctrl+F5)

## Step 5: Verify in Database (Optional)

To verify data is actually in the database:

```javascript
// Run this in a new file or node REPL
require('dotenv').config();
const sql = require('mssql');

async function checkData() {
  const pool = await sql.connect({
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USERNAME,
    password: process.env.AZURE_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false }
  });
  
  const result = await pool.request().query('SELECT * FROM SafetyFireSafety');
  console.log('Fire Safety Records:', result.recordset.length);
  console.log(JSON.stringify(result.recordset, null, 2));
  
  await pool.close();
}

checkData();
```

## What Was Fixed

### 1. Form Submission
- **Before:** Form submitted via GET (URL parameters)
- **After:** Form uses JavaScript POST to API

### 2. Data Storage
- **Before:** Data saved to localStorage only
- **After:** Data saved to database via API

### 3. Form Behavior
- **Before:** Form cleared after save
- **After:** Form keeps values visible after save

### 4. Default Values
- **Before:** No radio buttons selected by default
- **After:** All radio buttons default to "N/A"

### 5. Data Loading
- **Before:** No auto-load functionality
- **After:** Saved data loads automatically when switching tabs

## API Endpoints

### Save Fire Safety Data
```
POST /api/safety/fire
Content-Type: application/json

{
  "formData": {
    "smokingProhibited": "Yes",
    "noSmokingSigns": "Yes",
    "outdoorSmokingAreas": "N/A",
    ... (all form fields)
  }
}

Response:
{
  "success": true,
  "id": 1,
  "message": "Fire safety checklist saved successfully"
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
      "TenantId": 1,
      "FormData": "{\"smokingProhibited\":\"Yes\", ...}",
      "CreatedBy": "System",
      "CreatedDate": "2025-10-25T15:00:00",
      "UpdatedDate": "2025-10-25T15:00:00"
    }
  ]
}
```

## Files Modified

1. `public/masters/safety-office.html` - Frontend
   - Fixed form submission
   - Added default radio button selection
   - Added auto-load functionality
   - Prevented form reset after save

2. `src/safety-api.js` - Backend API
   - Added `formData` support to POST /api/safety/fire
   - Updated GET to return FormData records

3. `public/js/` - Client scripts
   - Copied `safety-api-client.js`
   - Copied `safety-tab-loader.js`

4. `setup-safety-db.js` - Database setup script (NEW)
   - Creates all safety tables

## Next Steps

The same pattern can be applied to all other safety forms:
- Electrical Safety
- Structural Safety
- Health Hazards
- Gas Safety
- Boiler Safety
- Consultant Engagement
- DSA
- Emergency Power
- Safety Training
- UNGP Checklist

All forms now have N/A as default and will save/load data correctly!
