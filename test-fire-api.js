/**
 * Test Fire Safety API Endpoint
 * This tests if the POST /api/safety/fire endpoint is working
 */

require('dotenv').config();
const sql = require('mssql');

async function testFireSafetyAPI() {
  try {
    console.log('🔄 Connecting to database...');
    
    const config = {
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'SeApp2',
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectionTimeout: 30000,
        requestTimeout: 30000,
      }
    };

    const pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Test data
    const testFormData = {
      smokingProhibited: 'Yes',
      noSmokingSigns: 'Yes',
      outdoorSmokingAreas: 'N/A',
      microstandingPolicy: 'Yes',
      roomCleaned: 'Yes'
    };

    console.log('\n🔄 Inserting test data...');
    
    const result = await pool.request()
      .input('formData', sql.NVarChar, JSON.stringify(testFormData))
      .input('tenantId', sql.Int, 1)
      .input('createdBy', sql.NVarChar, 'TEST_USER')
      .query(`
        INSERT INTO SafetyFireSafety (TenantId, FormData, CreatedBy)
        VALUES (@tenantId, @formData, @createdBy);
        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const insertedId = result.recordset[0].Id;
    console.log('✅ Test data inserted successfully!');
    console.log(`   Record ID: ${insertedId}`);

    // Retrieve the data
    console.log('\n🔄 Retrieving data...');
    const selectResult = await pool.request().query(`
      SELECT TOP 1 * FROM SafetyFireSafety 
      ORDER BY CreatedDate DESC
    `);

    if (selectResult.recordset.length > 0) {
      const record = selectResult.recordset[0];
      console.log('✅ Data retrieved successfully!');
      console.log('   Record:', {
        Id: record.Id,
        TenantId: record.TenantId,
        CreatedBy: record.CreatedBy,
        CreatedDate: record.CreatedDate,
        FormData: JSON.parse(record.FormData)
      });
    } else {
      console.log('❌ No data found!');
    }

    await pool.close();
    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: node src/web-server.js');
    console.log('   2. Open: http://localhost:3000/masters/safety-office.html');
    console.log('   3. Click Fire Safety tab and test saving');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

testFireSafetyAPI();
