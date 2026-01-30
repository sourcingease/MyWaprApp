/**
 * Setup Consultant Engagement Table
 */

require('dotenv').config();
const sql = require('mssql');

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

async function setupConsultantTable() {
  let pool;
  
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');

    // Create Consultant Engagement Table
    console.log('\n📋 Creating SafetyConsultant table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyConsultant')
      CREATE TABLE SafetyConsultant (
        Id INT PRIMARY KEY IDENTITY(1,1),
        TenantId INT,
        FormData NVARCHAR(MAX),
        CreatedBy NVARCHAR(255),
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ SafetyConsultant table created/verified');

    // Verify the table exists
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'SafetyConsultant'
    `);
    
    if (result.recordset.length > 0) {
      console.log('✅ SafetyConsultant table confirmed in database');
    } else {
      console.log('❌ SafetyConsultant table not found after creation');
    }

  } catch (err) {
    console.error('❌ Error setting up SafetyConsultant table:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

setupConsultantTable();
