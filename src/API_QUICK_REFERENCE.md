# Safety Office API - Quick Reference

## Backend API Endpoints

### Base URL
```
/api/safety
```

### All Endpoints Follow REST Pattern

| Tab | GET (List) | POST (Create) | PUT (Update) | DELETE |
|-----|-----------|--------------|--------------|---------|
| USC-Safe | `/usc-safe` | `/usc-safe` | `/usc-safe/:id` | `/usc-safe/:id` |
| Fire Safety | `/fire` | `/fire` | `/fire/:id` | `/fire/:id` |
| Electrical | `/electrical` | `/electrical` | `/electrical/:id` | `/electrical/:id` |
| Structural | `/structural` | `/structural` | `/structural/:id` | `/structural/:id` |
| Health Hazards | `/health` | `/health` | `/health/:id` | `/health/:id` |
| Gas Safety | `/gas` | `/gas` | `/gas/:id` | `/gas/:id` |
| Boiler Safety | `/boiler` | `/boiler` | `/boiler/:id` | `/boiler/:id` |
| Consultant | `/consultant` | `/consultant` | `/consultant/:id` | `/consultant/:id` |
| DSA | `/dsa` | `/dsa` | `/dsa/:id` | `/dsa/:id` |
| Emergency Power | `/emergency-power` | `/emergency-power` | `/emergency-power/:id` | `/emergency-power/:id` |
| Safety Training | `/training` | `/training` | `/training/:id` | `/training/:id` |
| UNGP | `/ungp` | `/ungp` | `/ungp/:id` | `/ungp/:id` |
| Incidents | `/incidents` | `/incidents` | `/incidents/:id` | `/incidents/:id` |
| Grievances | `/grievances` | `/grievances` | `/grievances/:id` | `/grievances/:id` |

---

## Frontend API Client Functions

### Include the Script
```html
<script src="/js/safety-api-client.js"></script>
```

### USC-Safe
```javascript
// Save
await SafetyAPI.saveUSCSafe(formData, recordId);

// Load
const data = await SafetyAPI.loadUSCSafe();

// Delete
await SafetyAPI.deleteUSCSafe(recordId);
```

### Fire Safety
```javascript
// Save
await SafetyAPI.saveFireSafety(formData, recordId);

// Load All
const records = await SafetyAPI.loadFireSafety();

// Delete
await SafetyAPI.deleteFireSafety(recordId);
```

### Electrical Safety
```javascript
await SafetyAPI.saveElectricalSafety(formData, recordId);
const records = await SafetyAPI.loadElectricalSafety();
await SafetyAPI.deleteElectricalSafety(recordId);
```

### Structural Safety
```javascript
await SafetyAPI.saveStructuralSafety(formData, recordId);
const records = await SafetyAPI.loadStructuralSafety();
await SafetyAPI.deleteStructuralSafety(recordId);
```

### Health Hazards
```javascript
await SafetyAPI.saveHealthHazards(formData, recordId);
const records = await SafetyAPI.loadHealthHazards();
await SafetyAPI.deleteHealthHazards(recordId);
```

### Gas Safety
```javascript
await SafetyAPI.saveGasSafety(formData, recordId);
const data = await SafetyAPI.loadGasSafety();
await SafetyAPI.deleteGasSafety(recordId);
```

### Boiler Safety
```javascript
await SafetyAPI.saveBoilerSafety(formData, recordId);
const data = await SafetyAPI.loadBoilerSafety();
await SafetyAPI.deleteBoilerSafety(recordId);
```

### Consultant
```javascript
await SafetyAPI.saveConsultant(formData, recordId);
const data = await SafetyAPI.loadConsultant();
await SafetyAPI.deleteConsultant(recordId);
```

### DSA
```javascript
await SafetyAPI.saveDSA(formData, recordId);
const data = await SafetyAPI.loadDSA();
await SafetyAPI.deleteDSA(recordId);
```

### Emergency Power
```javascript
await SafetyAPI.saveEmergencyPower(formData, recordId);
const data = await SafetyAPI.loadEmergencyPower();
await SafetyAPI.deleteEmergencyPower(recordId);
```

### Safety Training
```javascript
await SafetyAPI.saveSafetyTraining(formData, recordId);
const data = await SafetyAPI.loadSafetyTraining();
await SafetyAPI.deleteSafetyTraining(recordId);
```

### UNGP
```javascript
await SafetyAPI.saveUNGP(formData, recordId);
const data = await SafetyAPI.loadUNGP();
await SafetyAPI.deleteUNGP(recordId);
```

### Incidents
```javascript
await SafetyAPI.saveIncident(incidentData, recordId);
const records = await SafetyAPI.loadIncidents();
await SafetyAPI.deleteIncident(recordId);
```

### Grievances
```javascript
await SafetyAPI.saveGrievance(grievanceData, recordId);
const records = await SafetyAPI.loadGrievances();
await SafetyAPI.deleteGrievance(recordId);
```

---

## Helper Functions

### Collect Form Data
```javascript
const form = document.getElementById('my-form');
const formData = SafetyAPI.collectFormData(form);
```

### Populate Form
```javascript
const form = document.getElementById('my-form');
SafetyAPI.populateForm(form, data);
```

### Show Messages
```javascript
SafetyAPI.showSuccessMessage('Operation successful!');
SafetyAPI.showErrorMessage('Operation failed!');
```

---

## Complete Save/Load Pattern

```javascript
// SAVE FUNCTION
async function saveMyTab() {
  try {
    const form = document.getElementById('my-form');
    const formData = SafetyAPI.collectFormData(form);
    
    await SafetyAPI.saveMyTab(formData);
    SafetyAPI.showSuccessMessage('Data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Save failed: ' + error.message);
  }
}

// LOAD FUNCTION
async function loadMyTab() {
  try {
    const data = await SafetyAPI.loadMyTab();
    if (data) {
      const form = document.getElementById('my-form');
      SafetyAPI.populateForm(form, data);
    }
  } catch (error) {
    console.error('Load failed:', error);
  }
}

// LOAD ON TAB ACTIVATION
document.addEventListener('shown.bs.tab', function(e) {
  if (e.target.getAttribute('href') === '#my-tab') {
    loadMyTab();
  }
});
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Database Tables

| Table Name | Storage Type |
|-----------|-------------|
| SafetyUSCSafe | JSON (FormData column) |
| SafetyFireSafety | JSON (FormData column) |
| SafetyElectrical | Individual fields |
| SafetyStructural | Individual fields |
| SafetyHealthHazards | Individual fields |
| SafetyGasSafety | JSON (FormData column) |
| SafetyBoilerSafety | JSON (FormData column) |
| SafetyConsultant | JSON (FormData column) |
| SafetyDSA | JSON (FormData column) |
| SafetyEmergencyPower | JSON (FormData column) |
| SafetySafetyTraining | JSON (FormData column) |
| SafetyUNGP | JSON (FormData column) |
| SafetyIncidents | Individual fields |
| SafetyGrievances | Individual fields |

---

## Button Examples

```html
<!-- Save Button -->
<button type="button" onclick="saveUSCSafeTab()">Save</button>

<!-- Load Button -->
<button type="button" onclick="loadUSCSafeTab()">Load</button>

<!-- Delete Button -->
<button type="button" onclick="deleteRecord(recordId)">Delete</button>
```

---

## Testing with curl

### GET
```bash
curl http://localhost:3000/api/safety/usc-safe
```

### POST
```bash
curl -X POST http://localhost:3000/api/safety/usc-safe \
  -H "Content-Type: application/json" \
  -d '{"formData": {"field1": "value1"}, "tenantId": 1, "createdBy": "Test User"}'
```

### PUT
```bash
curl -X PUT http://localhost:3000/api/safety/usc-safe/1 \
  -H "Content-Type: application/json" \
  -d '{"formData": {"field1": "updated value"}, "tenantId": 1}'
```

### DELETE
```bash
curl -X DELETE http://localhost:3000/api/safety/usc-safe/1
```

---

## Common Patterns

### Tab with Single Record (e.g., USC-Safe)
```javascript
// Always get latest record
const data = await SafetyAPI.loadUSCSafe();

// Save creates new or updates existing
await SafetyAPI.saveUSCSafe(formData);
```

### Tab with Multiple Records (e.g., Fire Safety)
```javascript
// Get all records
const records = await SafetyAPI.loadFireSafety();

// Create new
await SafetyAPI.saveFireSafety(formData);

// Update specific
await SafetyAPI.saveFireSafety(formData, recordId);

// Delete specific
await SafetyAPI.deleteFireSafety(recordId);
```

---

## Error Handling Best Practices

```javascript
async function saveData() {
  try {
    // Validate before saving
    if (!validateForm()) {
      SafetyAPI.showErrorMessage('Please fill all required fields');
      return;
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveUSCSafe(formData);
    SafetyAPI.showSuccessMessage('Saved successfully!');
    
  } catch (error) {
    console.error('Save error:', error);
    SafetyAPI.showErrorMessage('Save failed: ' + error.message);
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 404 | Record not found |
| 500 | Server error |

---

## Tips

1. **Always use try/catch** with async/await
2. **Validate form data** before saving
3. **Show user feedback** (success/error messages)
4. **Reload data** after create/update/delete
5. **Confirm before delete** operations
6. **Handle empty data** gracefully (no records found)
