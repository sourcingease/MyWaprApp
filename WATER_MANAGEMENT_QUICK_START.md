# Water Management Module - Quick Start Guide

## What's New?

A complete water management system has been added to your Production module with:
- 🏭 Water Purchasing (from suppliers)
- 💧 Water from Rain (collection tracking)
- 📊 Water Usage (consumption tracking by department)
- 🗄️ Full Database Integration
- ✅ Complete CRUD Operations
- 📡 REST API Endpoints

## Quick Setup (5 Minutes)

### Step 1: Initialize Database
Run the water management database setup:

```bash
npm run water:setup
```

This will:
- ✅ Create 3 new database tables
- ✅ Create 9 stored procedures for CRUD operations
- ✅ Create performance indexes
- ✅ Connect to your Azure SQL Database

### Step 2: Start the Web Server
```bash
npm run web
```

### Step 3: Access the Module
1. Open http://localhost:3000
2. Click 🏭 **Production** in the left menu
3. Click 💧 **Water Resources** submenu
4. Choose your form:
   - **Water Purchasing** - Record water purchases
   - **Water from Rain** - Track rainwater collection
   - **Water Usage** - Track water consumption

## Features

### 🌊 Water Purchasing Form
Track all water purchases from suppliers:
- Supplier details (name, contact)
- Purchase date
- Quantity and unit (Liters, Gallons, Cubic Meters, Barrels)
- **Auto-calculated total cost** (qty × cost per unit)
- Payment method
- Invoice tracking
- Tank assignment
- Notes

### 🌧️ Water from Rain Form
Document rainwater collection:
- Collection date and location
- Quantity collected
- Rain tank assignment
- Water quality assessment
- Treatment requirements
- Personnel tracking
- Notes

### 💧 Water Usage Form
Track water consumption:
- Department selection
- Usage date
- Quantity used
- Purpose (Dyeing, Printing, Washing, Cooling, Cleaning)
- Water-efficient technology used
- Efficiency reduction percentage
- Water source tracking
- Monthly reporting
- **Live records table** with Edit/Delete actions

## API Endpoints

All endpoints are available at: `http://localhost:3000/api/water`

### Water Buying
```
GET    /buying           - Get all records
GET    /buying/:id       - Get specific record
POST   /buying           - Create new record
PUT    /buying/:id       - Update record
DELETE /buying/:id       - Delete record
```

### Water Rain Collection
```
GET    /rain             - Get all records
GET    /rain/:id         - Get specific record
POST   /rain             - Create new record
PUT    /rain/:id         - Update record
DELETE /rain/:id         - Delete record
```

### Water Usage
```
GET    /usage            - Get all records
GET    /usage/:id        - Get specific record
POST   /usage            - Create new record
PUT    /usage/:id        - Update record
DELETE /usage/:id        - Delete record
```

## Database Tables

### water_buying
Stores all water purchase records with supplier info, costs, and tank assignment.

### water_rain_collection
Tracks rainwater collection with quality assessment and treatment details.

### water_usage
Records daily water consumption by department with efficiency metrics.

## Testing

### Using the Web Interface
1. Fill out a form
2. Click "Save" or "Add"
3. See success message
4. For Water Usage, see records appear in the table below

### Using API (cURL/Postman)

**Create a water buying record:**
```bash
curl -X POST http://localhost:3000/api/water/buying \
  -H "Content-Type: application/json" \
  -d '{
    "supplierName": "Clean Water Co",
    "supplierContact": "555-1234",
    "dateOfPurchase": "2026-01-20",
    "quantityPurchased": 1000,
    "unit": "liters",
    "costPerUnit": 5.50,
    "totalCost": 5500,
    "paymentMethod": "bank-transfer",
    "invoiceNumber": "INV-2026-001",
    "waterTank": "tank-p",
    "notes": "Regular supply"
  }'
```

**Get all water usage records:**
```bash
curl http://localhost:3000/api/water/usage
```

**Delete a record:**
```bash
curl -X DELETE http://localhost:3000/api/water/buying/1
```

## Files Created/Modified

### New Files
- `src/routes/water-management.js` - API endpoints
- `database/water_management_setup.sql` - Database schema
- `src/setup-water-db.js` - Setup script
- `docs/WATER_MANAGEMENT_GUIDE.md` - Complete documentation

### Modified Files
- `public/production.html` - Added water usage form
- `public/app.html` - Added Production menu to master nav
- `public/masters/safety-office.html` - Added Production to left nav
- `src/web-server.js` - Registered water API routes
- `package.json` - Added water:setup script

## Next Steps

### Optional: Run Comprehensive Tests
```bash
npm run app-test
```

This will test all endpoints including the new water management APIs.

### View the Complete Guide
For detailed information, see: [docs/WATER_MANAGEMENT_GUIDE.md](../docs/WATER_MANAGEMENT_GUIDE.md)

### Future Enhancements
- ✨ Edit existing records
- 📈 Water usage dashboard
- 📊 Monthly reports
- 🔔 Low stock alerts
- 💰 Cost analysis
- 📉 Consumption trends

## Troubleshooting

### Issue: Tables already exist
- If you get errors about tables already existing, you can safely ignore them
- Or drop and recreate: Run `DROP TABLE IF EXISTS water_*` before setup

### Issue: API not responding
- Ensure web server is running: `npm run web`
- Check browser console for errors
- Verify database connection: Fill a form and check logs

### Issue: Data not saving
- Check database connection in `.env` file
- Ensure tables are created: `npm run water:setup`
- Check browser console for error messages

## Support

For issues:
1. Check the console logs
2. Review the [WATER_MANAGEMENT_GUIDE.md](../docs/WATER_MANAGEMENT_GUIDE.md)
3. Verify database tables: `SELECT * FROM water_buying;`
4. Test API: `curl http://localhost:3000/api/water/usage`

## Summary

✅ **Water Management System is Ready!**

- 3 comprehensive forms
- Full database integration
- Complete CRUD operations
- REST API endpoints
- Real-time data sync
- Beautiful responsive UI
- Production-ready code

**Start by running:**
```bash
npm run water:setup  # Initialize database
npm run web          # Start server
```

Then visit http://localhost:3000 and navigate to Production → Water Resources!
