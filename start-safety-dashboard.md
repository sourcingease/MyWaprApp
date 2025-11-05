# Quick Start Guide - Safety Officer Dashboard

## 🚀 3-Step Setup

### Step 1: Create Database Tables
```bash
node src/setup-safety-tables.js
```

Expected output:
```
🔌 Connecting to Azure SQL Database...
✅ Connected successfully!

📋 Creating Incidents table...
✅ Incidents table created

📋 Creating Grievances table...
✅ Grievances table created

📋 Creating Fire Safety table...
✅ Fire Safety table created

📋 Creating Electrical Safety table...
✅ Electrical Safety table created

📋 Creating Structural Safety table...
✅ Structural Safety table created

📋 Creating Health Hazards table...
✅ Health Hazards table created

✅ All Safety Officer tables created successfully!

🔌 Database connection closed
```

### Step 2: Start Web Server
```bash
npm run web
```

Expected output:
```
🌐 SaaS Agent Web GUI started!
📱 Open your browser and go to: http://localhost:3000
✅ Safety Officer database connection established
✅ Safety API routes configured
```

### Step 3: Access Dashboard
Open your browser and navigate to:
```
http://localhost:3000/masters/safety-office.html
```

## ✅ Verification Checklist

- [ ] Database tables created without errors
- [ ] Web server started on port 3000
- [ ] Safety API routes loaded
- [ ] Dashboard loads in browser
- [ ] Can switch between tabs
- [ ] Can open "Add New" form
- [ ] Can save data (appears in table)
- [ ] Can export to Excel
- [ ] Reset button clears radio buttons
- [ ] Back button returns to Overview tab

## 🎯 Key Features to Test

### 1. **Incidents Tab**
```
1. Click "Incidents" tab
2. Click "➕ Add New"
3. Fill in:
   - Incident Date: [Select date/time]
   - Incident Type: Injury
   - Location: Production Floor A
   - Department: Manufacturing
   - Injury Occurred: Yes ⚫
   - Property Damage: No ⚫
   - Severity: High
   - Reported By: John Doe
4. Click "💾 Save"
5. Verify record appears in table
6. Click "📊 Export to Excel"
7. Verify CSV downloads
```

### 2. **Grievances Tab**
```
1. Click "Grievances" tab
2. Click "➕ Add New"
3. Fill in:
   - Grievance Date: [Select date/time]
   - Complainant Name: Jane Smith
   - Grievance Type: Working Conditions
   - Priority: High
   - Status: Pending
4. Click "💾 Save"
5. Verify record in table
```

### 3. **Fire Safety Tab**
```
1. Click "Fire Safety" tab
2. Click "➕ Add New"
3. Fill in:
   - Inspection Date: [Select date/time]
   - Location: Building A - Floor 2
   - Fire Extinguishers Count: 10
   - Fire Extinguishers Working: Yes ⚫
   - Smoke Detectors Count: 15
   - Smoke Detectors Working: Yes ⚫
   - Fire Alarms Working: Yes ⚫
   - Emergency Exits Clear: Yes ⚫
   - Fire Drill Conducted: Yes ⚫
4. Click "💾 Save"
5. Verify record saves
```

### 4. **Reset Functionality**
```
1. Open any form
2. Fill in some fields
3. Select radio buttons
4. Click "🔄 Reset"
5. Verify all fields cleared
6. Verify radio buttons unchecked
```

### 5. **Back Navigation**
```
1. From any tab
2. Click "← Back"
3. Verify returns to Overview tab
4. Verify Overview dashboard displays
```

## 🔧 Troubleshooting

### Issue: Tables not created
**Solution:**
```bash
# Check your .env file
cat .env

# Verify connection string
node tests/health-check.js
```

### Issue: API routes not working
**Solution:**
```bash
# Check server logs for errors
# Restart the server
npm run web
```

### Issue: Data not saving
**Solution:**
```bash
# Open browser console (F12)
# Check for JavaScript errors
# Verify API endpoints responding:
curl http://localhost:3000/api/safety/incidents
```

### Issue: Radio buttons not resetting
**Solution:**
- Already implemented in resetForm() function
- Check browser console for errors
- Verify JavaScript loaded correctly

## 📊 Sample Data for Testing

### Sample Incident
```json
{
  "incidentDate": "2025-10-22T14:30",
  "incidentType": "Equipment Failure",
  "location": "Production Line 3",
  "department": "Manufacturing",
  "description": "Conveyor belt motor failed during operation",
  "injuryOccurred": "No",
  "propertyDamage": "Yes",
  "severity": "Medium",
  "reportedBy": "Mike Johnson",
  "investigationStatus": "In Progress",
  "correctiveAction": "Replace motor and perform maintenance check",
  "status": "Open"
}
```

### Sample Grievance
```json
{
  "grievanceDate": "2025-10-22T10:00",
  "complainantName": "Sarah Williams",
  "complainantRole": "Floor Supervisor",
  "grievanceType": "Safety Concern",
  "category": "PPE Shortage",
  "description": "Insufficient safety goggles available for workers",
  "priority": "High",
  "assignedTo": "Safety Manager",
  "resolutionDetails": "Order placed for 100 additional safety goggles",
  "status": "Under Review"
}
```

### Sample Fire Safety Inspection
```json
{
  "inspectionDate": "2025-10-22T09:00",
  "location": "Warehouse Building B",
  "equipmentType": "Fire Extinguisher",
  "equipmentId": "FE-B-001",
  "fireExtinguishersCount": 12,
  "fireExtinguishersWorking": "Yes",
  "smokeDetectorsCount": 20,
  "smokeDetectorsWorking": "Yes",
  "fireAlarmsWorking": "Yes",
  "emergencyExitsClear": "Yes",
  "fireDrillConducted": "Yes",
  "lastDrillDate": "2025-10-15T11:00",
  "deficiencies": "None noted",
  "correctiveActions": "Continue monthly inspections",
  "inspectedBy": "Fire Safety Officer",
  "status": "Compliant"
}
```

## 🎓 API Testing with cURL

### Create Incident
```bash
curl -X POST http://localhost:3000/api/safety/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "incidentDate": "2025-10-22T14:30",
    "incidentType": "Injury",
    "location": "Production Floor",
    "injuryOccurred": "Yes",
    "propertyDamage": "No",
    "severity": "Low",
    "status": "Open"
  }'
```

### Get All Incidents
```bash
curl http://localhost:3000/api/safety/incidents
```

### Delete Incident
```bash
curl -X DELETE http://localhost:3000/api/safety/incidents/1
```

## 📝 Notes

- All radio button groups MUST have one option selected before saving
- Required fields are marked with asterisk (*)
- Export creates CSV files (compatible with Excel)
- Data persists to Azure SQL Database
- Forms validate on submission

## 🎉 Success!

If all steps work, you now have:
- ✅ Fully functional Safety Officer Dashboard
- ✅ 3 complete modules (Incidents, Grievances, Fire Safety)
- ✅ Database integration
- ✅ Excel export capability
- ✅ Professional ComplytEX UI

## 📚 Next Steps

1. Read full documentation: `SAFETY_DASHBOARD_README.md`
2. Implement remaining tabs (Electrical, Structural, Health Hazards)
3. Add edit modal functionality
4. Customize field options for your organization
5. Add user authentication/authorization
6. Set up automated backups

---

**Need Help?** Check the main README or server logs for errors.
