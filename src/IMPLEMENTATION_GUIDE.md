# Safety Office Module - Database Migration Implementation Guide

## Overview
This guide will help you migrate all safety office tabs from localStorage to database-backed storage using the new API endpoints.

## Files Created

### 1. SQL Schema File
**Location:** `src/create-safety-tables.sql`

Contains table definitions for all safety tabs:
- SafetyUSCSafe
- SafetyFireSafety (if not exists already)
- SafetyElectrical
- SafetyStructural
- SafetyHealthHazards
- SafetyGasSafety
- SafetyBoilerSafety
- SafetyConsultant
- SafetyDSA
- SafetyEmergencyPower
- SafetySafetyTraining
- SafetyUNGP

### 2. Backend API Routes
**Location:** `src/safety-api.js` (updated)

New API endpoints added:
- `/api/safety/usc-safe` (GET, POST, PUT, DELETE)
- `/api/safety/gas` (GET, POST, PUT, DELETE)
- `/api/safety/boiler` (GET, POST, PUT, DELETE)
- `/api/safety/consultant` (GET, POST, PUT, DELETE)
- `/api/safety/dsa` (GET, POST, PUT, DELETE)
- `/api/safety/emergency-power` (GET, POST, PUT, DELETE)
- `/api/safety/training` (GET, POST, PUT, DELETE)
- `/api/safety/ungp` (GET, POST, PUT, DELETE)

### 3. Frontend API Client
**Location:** `src/js/safety-api-client.js`

Provides easy-to-use functions for all safety operations.

---

## Implementation Steps

### Step 1: Create Database Tables

1. Connect to your SQL Server database
2. Run the SQL script:
   ```sql
   -- Execute the create-safety-tables.sql script
   -- Location: src/create-safety-tables.sql
   ```

3. Verify tables were created:
   ```sql
   SELECT TABLE_NAME 
   FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_NAME LIKE 'Safety%'
   ORDER BY TABLE_NAME;
   ```

### Step 2: Verify Backend API Routes

1. Ensure your main server file includes safety-api.js:
   ```javascript
   const { setupSafetyRoutes } = require('./safety-api');
   
   // After creating your database pool
   setupSafetyRoutes(app, pool);
   ```

2. Restart your Node.js server

3. Test an endpoint (e.g., using Postman or curl):
   ```bash
   curl http://localhost:3000/api/safety/usc-safe
   ```

### Step 3: Include Frontend API Client in HTML

Add this script tag to your `safety-office.html` file (in the `<head>` or before `</body>`):

```html
<script src="/js/safety-api-client.js"></script>
```

### Step 4: Update Each Tab's Save/Load Functions

Replace existing localStorage save/load functions with API calls.

#### Example: USC-Safe Tab

**OLD CODE (localStorage):**
```javascript
function saveUSCSafe() {
  const formData = {};
  // ... collect form data ...
  localStorage.setItem('uscSafeData', JSON.stringify(formData));
  alert('USC-Safe data saved!');
}

function loadUSCSafe() {
  const data = localStorage.getItem('uscSafeData');
  if (data) {
    const formData = JSON.parse(data);
    // ... populate form ...
  }
}
```

**NEW CODE (API):**
```javascript
async function saveUSCSafeTab() {
  try {
    const form = document.getElementById('usc-safe-form');
    const formData = SafetyAPI.collectFormData(form);
    
    await SafetyAPI.saveUSCSafe(formData);
    SafetyAPI.showSuccessMessage('USC-Safe data saved successfully!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save USC-Safe data: ' + error.message);
  }
}

async function loadUSCSafeTab() {
  try {
    const data = await SafetyAPI.loadUSCSafe();
    if (data) {
      const form = document.getElementById('usc-safe-form');
      SafetyAPI.populateForm(form, data);
    }
  } catch (error) {
    console.error('Failed to load USC-Safe data:', error);
  }
}

// Load data when tab is shown
document.addEventListener('DOMContentLoaded', function() {
  loadUSCSafeTab();
});
```

#### Example: Fire Safety Tab

**NEW CODE:**
```javascript
async function saveFireSafetyTab() {
  try {
    const form = document.getElementById('fire-safety-form');
    const formData = SafetyAPI.collectFormData(form);
    
    await SafetyAPI.saveFireSafety(formData);
    SafetyAPI.showSuccessMessage('Fire Safety data saved!');
    
    // Refresh the list
    loadFireSafetyRecords();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

async function loadFireSafetyRecords() {
  try {
    const records = await SafetyAPI.loadFireSafety();
    displayFireSafetyRecords(records);
  } catch (error) {
    console.error('Failed to load records:', error);
  }
}

function displayFireSafetyRecords(records) {
  const tbody = document.getElementById('fire-safety-table-body');
  tbody.innerHTML = '';
  
  records.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.InspectionDate}</td>
      <td>${record.Location}</td>
      <td>${record.InspectedBy}</td>
      <td>${record.Status}</td>
      <td>
        <button onclick="editFireSafetyRecord(${record.Id})">Edit</button>
        <button onclick="deleteFireSafetyRecord(${record.Id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteFireSafetyRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  try {
    await SafetyAPI.deleteFireSafety(id);
    SafetyAPI.showSuccessMessage('Record deleted!');
    loadFireSafetyRecords();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}
```

### Step 5: Update Button Click Handlers

Update your HTML button onclick handlers:

```html
<!-- OLD -->
<button onclick="saveDataToLocalStorage()">Save</button>

<!-- NEW -->
<button onclick="saveUSCSafeTab()">Save</button>
<button onclick="saveFireSafetyTab()">Save</button>
<button onclick="saveGasSafetyTab()">Save</button>
<!-- etc. -->
```

### Step 6: Handle Tab Switching

Add event listeners to load data when a tab is activated:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Get all tab links
  const tabLinks = document.querySelectorAll('.nav-link');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetTab = this.getAttribute('data-bs-target');
      
      // Load data for the specific tab
      switch(targetTab) {
        case '#usc-safe':
          loadUSCSafeTab();
          break;
        case '#fire-safety':
          loadFireSafetyRecords();
          break;
        case '#electrical-safety':
          loadElectricalRecords();
          break;
        case '#gas-safety':
          loadGasSafetyTab();
          break;
        // Add more cases for each tab
      }
    });
  });
  
  // Load the active tab on page load
  const activeTab = document.querySelector('.nav-link.active');
  if (activeTab) {
    activeTab.click();
  }
});
```

---

## API Function Reference

### Form-Based Tabs (store entire form as JSON)
These tabs store all data in a single JSON field:

- `SafetyAPI.saveUSCSafe(formData, recordId)`
- `SafetyAPI.loadUSCSafe()`
- `SafetyAPI.saveGasSafety(formData, recordId)`
- `SafetyAPI.loadGasSafety()`
- `SafetyAPI.saveBoilerSafety(formData, recordId)`
- `SafetyAPI.loadBoilerSafety()`
- `SafetyAPI.saveConsultant(formData, recordId)`
- `SafetyAPI.loadConsultant()`
- `SafetyAPI.saveDSA(formData, recordId)`
- `SafetyAPI.loadDSA()`
- `SafetyAPI.saveEmergencyPower(formData, recordId)`
- `SafetyAPI.loadEmergencyPower()`
- `SafetyAPI.saveSafetyTraining(formData, recordId)`
- `SafetyAPI.loadSafetyTraining()`
- `SafetyAPI.saveUNGP(formData, recordId)`
- `SafetyAPI.loadUNGP()`

### Record-Based Tabs (store as individual records)
These tabs maintain multiple records with specific fields:

- `SafetyAPI.saveFireSafety(formData, recordId)`
- `SafetyAPI.loadFireSafety()` - returns array
- `SafetyAPI.saveElectricalSafety(formData, recordId)`
- `SafetyAPI.loadElectricalSafety()` - returns array
- `SafetyAPI.saveStructuralSafety(formData, recordId)`
- `SafetyAPI.loadStructuralSafety()` - returns array
- `SafetyAPI.saveHealthHazards(formData, recordId)`
- `SafetyAPI.loadHealthHazards()` - returns array
- `SafetyAPI.saveIncident(formData, recordId)`
- `SafetyAPI.loadIncidents()` - returns array
- `SafetyAPI.saveGrievance(formData, recordId)`
- `SafetyAPI.loadGrievances()` - returns array

### Helper Functions

- `SafetyAPI.collectFormData(formElement)` - Collects all form inputs into an object
- `SafetyAPI.populateForm(formElement, data)` - Populates form from data object
- `SafetyAPI.showSuccessMessage(message)` - Display success notification
- `SafetyAPI.showErrorMessage(message)` - Display error notification

---

## Testing Checklist

### Backend Testing
- [ ] All tables created successfully
- [ ] GET endpoints return data
- [ ] POST endpoints create new records
- [ ] PUT endpoints update existing records
- [ ] DELETE endpoints remove records
- [ ] Error handling works properly

### Frontend Testing
- [ ] Script loads without errors
- [ ] Save buttons work on all tabs
- [ ] Data persists after page reload
- [ ] Load functions populate forms correctly
- [ ] Delete functions work and confirm before deletion
- [ ] Success/error messages display properly

### Migration Testing
- [ ] Existing localStorage data can be migrated (optional)
- [ ] Old and new systems don't conflict
- [ ] All tabs function independently

---

## Data Migration (Optional)

If you have existing data in localStorage that needs to be migrated:

```javascript
async function migrateLocalStorageToDatabase() {
  try {
    // Migrate USC-Safe
    const uscSafeData = localStorage.getItem('uscSafeData');
    if (uscSafeData) {
      const data = JSON.parse(uscSafeData);
      await SafetyAPI.saveUSCSafe(data);
      console.log('USC-Safe data migrated');
    }
    
    // Migrate Gas Safety
    const gasSafetyData = localStorage.getItem('gasSafetyData');
    if (gasSafetyData) {
      const data = JSON.parse(gasSafetyData);
      await SafetyAPI.saveGasSafety(data);
      console.log('Gas Safety data migrated');
    }
    
    // Add more migrations as needed...
    
    alert('Data migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    alert('Migration failed: ' + error.message);
  }
}

// Call this function once to migrate data
// migrateLocalStorageToDatabase();
```

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure your backend allows requests from your frontend origin
- Check CORS configuration in your Express app

**2. 404 Not Found**
- Verify backend routes are registered correctly
- Check the API_BASE_URL in safety-api-client.js

**3. Data Not Saving**
- Check browser console for errors
- Verify database connection in backend
- Ensure tables exist in database

**4. JSON Parse Errors**
- Ensure FormData is stored as valid JSON
- Check for undefined values in form data

**5. Authentication Issues**
- If using authentication, ensure tokens are passed correctly
- Update apiRequest function to include auth headers if needed

---

## Security Considerations

1. **Add authentication/authorization** to API endpoints
2. **Validate input** on the backend
3. **Use parameterized queries** (already implemented with mssql inputs)
4. **Implement rate limiting** on API endpoints
5. **Add HTTPS** in production
6. **Sanitize user input** before display

---

## Next Steps

1. Create database tables
2. Test API endpoints with Postman/curl
3. Include frontend script in HTML
4. Update one tab at a time (start with USC-Safe)
5. Test thoroughly before moving to next tab
6. Remove localStorage code once migration is complete
7. Add proper error handling and user notifications
8. Implement data backup procedures

---

## Support

For issues or questions:
1. Check the browser console for errors
2. Check the server logs for backend errors
3. Verify database connection and table existence
4. Review the API endpoint documentation above

## Example: Complete USC-Safe Implementation

Here's a complete example showing how to wire up the USC-Safe tab:

### HTML (safety-office.html)
```html
<div class="tab-pane fade" id="usc-safe" role="tabpanel">
  <h3>USC-Safe Checklist</h3>
  <form id="usc-safe-form">
    <div class="form-group">
      <label>Fire Extinguishers Available</label>
      <div>
        <input type="radio" name="fireExtinguishers" value="Yes"> Yes
        <input type="radio" name="fireExtinguishers" value="No"> No
        <input type="radio" name="fireExtinguishers" value="N/A"> N/A
      </div>
    </div>
    
    <!-- More form fields... -->
    
    <button type="button" class="btn btn-primary" onclick="saveUSCSafeTab()">
      Save USC-Safe Data
    </button>
  </form>
</div>

<script src="/js/safety-api-client.js"></script>
<script>
  async function saveUSCSafeTab() {
    try {
      const form = document.getElementById('usc-safe-form');
      const formData = SafetyAPI.collectFormData(form);
      
      await SafetyAPI.saveUSCSafe(formData);
      SafetyAPI.showSuccessMessage('USC-Safe data saved successfully!');
    } catch (error) {
      SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
    }
  }

  async function loadUSCSafeTab() {
    try {
      const data = await SafetyAPI.loadUSCSafe();
      if (data) {
        const form = document.getElementById('usc-safe-form');
        SafetyAPI.populateForm(form, data);
      }
    } catch (error) {
      console.error('Failed to load USC-Safe data:', error);
    }
  }

  // Load when tab becomes active
  document.addEventListener('shown.bs.tab', function(e) {
    if (e.target.getAttribute('href') === '#usc-safe') {
      loadUSCSafeTab();
    }
  });

  // Load on page load if this is the active tab
  document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('#usc-safe').classList.contains('active')) {
      loadUSCSafeTab();
    }
  });
</script>
```

That's it! Repeat this pattern for all other tabs, adjusting the function names and form IDs accordingly.
