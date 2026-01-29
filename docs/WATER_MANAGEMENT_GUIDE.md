# Water Management System - Implementation Guide

## Overview
Complete water management module with database integration, CRUD operations, and API endpoints for water buying, rain collection, and water usage tracking.

## Database Setup

### Step 1: Execute SQL Schema

Run the SQL script to create all necessary tables and stored procedures:

```sql
-- Execute the file:
database/water_management_setup.sql
```

This creates:
- **water_buying** - Records of water purchases from suppliers
- **water_rain_collection** - Records of rainwater collection
- **water_usage** - Records of water consumption by department
- **Indexes** - For performance optimization on date and tank columns
- **Stored Procedures** - sp_water_*_create, sp_water_*_read, sp_water_*_update, sp_water_*_delete

### Step 2: Database Tables Schema

#### water_buying Table
```
id (INT, PK, Identity)
supplier_name (NVARCHAR(255))
supplier_contact (NVARCHAR(255))
date_of_purchase (DATE)
quantity_purchased (DECIMAL)
unit (NVARCHAR(50))
cost_per_unit (DECIMAL)
total_cost (DECIMAL)
payment_method (NVARCHAR(100))
invoice_number (NVARCHAR(100), UNIQUE)
water_tank (NVARCHAR(100))
notes (NVARCHAR(MAX))
created_at (DATETIME)
updated_at (DATETIME)
created_by (NVARCHAR(100))
updated_by (NVARCHAR(100))
```

#### water_rain_collection Table
```
id (INT, PK, Identity)
collection_date (DATE)
collection_location (NVARCHAR(255))
quantity_collected (DECIMAL)
collection_unit (NVARCHAR(50))
rain_tank (NVARCHAR(100))
water_quality (NVARCHAR(50))
treatment_required (NVARCHAR(10))
treatment_type (NVARCHAR(255))
collected_by (NVARCHAR(100))
notes (NVARCHAR(MAX))
created_at (DATETIME)
updated_at (DATETIME)
created_by (NVARCHAR(100))
updated_by (NVARCHAR(100))
```

#### water_usage Table
```
id (INT, PK, Identity)
department (NVARCHAR(100))
date_of_usage (DATE)
quantity_used (DECIMAL)
unit (NVARCHAR(50))
purpose_of_usage (NVARCHAR(255))
water_efficient_tech (NVARCHAR(255))
reduction_percentage (DECIMAL)
source_of_water (NVARCHAR(100))
available_qty (DECIMAL)
usage_month (DATE)
notes (NVARCHAR(MAX))
created_at (DATETIME)
updated_at (DATETIME)
created_by (NVARCHAR(100))
updated_by (NVARCHAR(100))
```

## API Endpoints

### Base URL
```
http://localhost:3000/api/water
```

### Water Buying Endpoints

#### GET All Water Buying Records
```
GET /api/water/buying
Response: { success: true, data: [...], count: number }
```

#### GET Single Water Buying Record
```
GET /api/water/buying/:id
Response: { success: true, data: {...} }
```

#### CREATE Water Buying Record
```
POST /api/water/buying
Body: {
  supplierName: string,
  supplierContact: string,
  dateOfPurchase: date,
  quantityPurchased: number,
  unit: string,
  costPerUnit: number,
  totalCost: number,
  paymentMethod: string,
  invoiceNumber: string,
  waterTank: string,
  notes: string
}
Response: { success: true, message: string, id: number }
```

#### UPDATE Water Buying Record
```
PUT /api/water/buying/:id
Body: { same as POST }
Response: { success: true, message: string }
```

#### DELETE Water Buying Record
```
DELETE /api/water/buying/:id
Response: { success: true, message: string }
```

### Water Rain Collection Endpoints

#### GET All Rain Collection Records
```
GET /api/water/rain
Response: { success: true, data: [...], count: number }
```

#### GET Single Rain Collection Record
```
GET /api/water/rain/:id
Response: { success: true, data: {...} }
```

#### CREATE Rain Collection Record
```
POST /api/water/rain
Body: {
  collectionDate: date,
  collectionLocation: string,
  quantityCollected: number,
  collectionUnit: string,
  rainTank: string,
  waterQuality: string,
  treatmentRequired: string,
  treatmentType: string,
  collectedBy: string,
  notes: string
}
Response: { success: true, message: string, id: number }
```

#### UPDATE Rain Collection Record
```
PUT /api/water/rain/:id
Body: { same as POST }
Response: { success: true, message: string }
```

#### DELETE Rain Collection Record
```
DELETE /api/water/rain/:id
Response: { success: true, message: string }
```

### Water Usage Endpoints

#### GET All Water Usage Records
```
GET /api/water/usage
Response: { success: true, data: [...], count: number }
```

#### GET Single Water Usage Record
```
GET /api/water/usage/:id
Response: { success: true, data: {...} }
```

#### CREATE Water Usage Record
```
POST /api/water/usage
Body: {
  department: string,
  dateOfUsage: date,
  quantityUsed: number,
  unit: string,
  purposeOfUsage: string,
  waterEfficientTech: string,
  reductionPercentage: number,
  sourceOfWater: string,
  availableQty: number,
  usageMonth: date,
  notes: string
}
Response: { success: true, message: string, id: number }
```

#### UPDATE Water Usage Record
```
PUT /api/water/usage/:id
Body: { same as POST }
Response: { success: true, message: string }
```

#### DELETE Water Usage Record
```
DELETE /api/water/usage/:id
Response: { success: true, message: string }
```

## Frontend Features

### Water Resources Module (`/production.html`)

#### Tab Navigation
- **Water Purchasing** - Purchase water from suppliers
- **Water from Rain** - Record rainwater collection
- **Water Usage** - Track water consumption by department

#### Water Purchasing Form
- Supplier information (name, contact)
- Purchase date
- Quantity and unit (Liters, Gallons, Cubic Meters, Barrels)
- Cost calculation (auto-calculates total cost)
- Payment method tracking
- Invoice number management
- Tank assignment
- Notes

#### Water from Rain Form
- Collection date and location
- Quantity collected
- Tank assignment (Rain tank A, B, C)
- Water quality assessment (Excellent, Good, Acceptable, Poor)
- Treatment requirements
- Collected by (personnel tracking)
- Notes

#### Water Usage Form
- Department selection (Dyeing, Printing, Washing, Finishing, Administration, Maintenance)
- Usage date
- Quantity and unit
- Purpose of usage (Fabric dyeing, Printing, Washing, Cooling, Cleaning)
- Water-efficient technology used (LLR Dye, Air Jet, Reverse Osmosis, Recycled Water)
- Reduction percentage
- Water source tracking
- Available quantity
- Month selection
- Notes

#### Features
- ✅ Auto-calculation of total costs
- ✅ Form validation
- ✅ Real-time database sync
- ✅ Success/Error messages
- ✅ Records table with Edit/Delete actions
- ✅ Responsive design
- ✅ Loading states

## File Locations

### Backend Files
- **API Routes:** `src/routes/water-management.js`
- **Database Schema:** `database/water_management_setup.sql`
- **Web Server Update:** `src/web-server.js` (added routes)

### Frontend Files
- **Production Module:** `public/production.html`
- **Main App Shell:** `public/app.html`
- **Left Navigation:** `public/masters/safety-office.html`

## Integration Steps

### Step 1: Run Database Setup
Execute the SQL script in your Azure SQL Database:
```bash
# Run through SQL Management Studio or Azure Data Studio:
# Execute: database/water_management_setup.sql
```

### Step 2: Verify API Routes
Check that the routes are registered in web-server.js:
```javascript
// Water Management Routes
const waterRoutes = require('./routes/water-management');
app.use('/api/water', waterRoutes);
```

### Step 3: Test the Module
1. Start the web server: `npm run web`
2. Navigate to http://localhost:3000
3. Click 🏭 Production in the left menu
4. Click 💧 Water Resources submenu
5. Fill out forms and submit

### Step 4: Verify Database Operations
Check that records are being saved:
```sql
SELECT * FROM water_buying;
SELECT * FROM water_rain_collection;
SELECT * FROM water_usage;
```

## CRUD Operations Summary

| Operation | Water Buying | Rain Collection | Water Usage |
|-----------|--------------|-----------------|-------------|
| Create | ✅ POST | ✅ POST | ✅ POST |
| Read | ✅ GET | ✅ GET | ✅ GET |
| Update | ✅ PUT | ✅ PUT | ✅ PUT |
| Delete | ✅ DELETE | ✅ DELETE | ✅ DELETE |
| List All | ✅ GET / | ✅ GET / | ✅ GET / |

## Error Handling

All endpoints return standardized responses:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* record data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Description of the error"
}
```

### HTTP Status Codes
- 200: Successful GET/PUT/DELETE
- 201: Successful POST (created)
- 400: Bad request (missing fields)
- 404: Record not found
- 500: Server error

## Testing the System

### Using Curl/Postman

#### Create Water Buying Record
```bash
curl -X POST http://localhost:3000/api/water/buying \
  -H "Content-Type: application/json" \
  -d '{
    "supplierName": "Water Supplies Inc",
    "supplierContact": "555-1234",
    "dateOfPurchase": "2026-01-20",
    "quantityPurchased": 1000,
    "unit": "liters",
    "costPerUnit": 5.50,
    "totalCost": 5500,
    "paymentMethod": "bank-transfer",
    "invoiceNumber": "INV-001",
    "waterTank": "tank-p",
    "notes": "First purchase"
  }'
```

#### Get All Records
```bash
curl http://localhost:3000/api/water/buying
curl http://localhost:3000/api/water/rain
curl http://localhost:3000/api/water/usage
```

#### Delete Record
```bash
curl -X DELETE http://localhost:3000/api/water/buying/1
```

## Performance Considerations

- **Indexes** created on:
  - water_buying.date_of_purchase
  - water_buying.water_tank
  - water_rain_collection.collection_date
  - water_usage.date_of_usage
  - water_usage.department

- **Stored Procedures** used for all CRUD operations
- **Connection pooling** through Azure SQL Connector
- **Batch operations** supported through API

## Future Enhancements

1. **Reporting Dashboard**
   - Monthly water consumption reports
   - Cost analysis
   - Efficiency metrics

2. **Advanced Features**
   - Edit records functionality
   - Bulk import/export
   - Water tank inventory tracking
   - Compliance reporting

3. **Analytics**
   - Water usage trends
   - Cost forecasting
   - Department-wise consumption
   - Savings metrics

4. **Notifications**
   - Low tank alerts
   - High usage warnings
   - Cost thresholds

## Support

For issues or questions:
1. Check the database connections
2. Verify SQL tables are created
3. Review browser console for JavaScript errors
4. Check server logs for API errors
5. Ensure all API routes are properly registered
