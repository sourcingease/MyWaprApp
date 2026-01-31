// Quick script to create checklist tables
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

async function createTables() {
  console.log('Connecting to database...');
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected');

    // Create SafetyChecklistHeadings table
    console.log('Creating SafetyChecklistHeadings table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyChecklistHeadings')
      BEGIN
          CREATE TABLE SafetyChecklistHeadings (
              id INT IDENTITY(1,1) PRIMARY KEY,
              tab_id NVARCHAR(50) NOT NULL,
              heading_text NVARCHAR(255) NOT NULL,
              heading_slug NVARCHAR(255) NOT NULL,
              display_order INT DEFAULT 0,
              created_at DATETIME DEFAULT GETDATE(),
              created_by NVARCHAR(100),
              CONSTRAINT UQ_SafetyChecklistHeadings_TabHeading UNIQUE (tab_id, heading_slug)
          );
          PRINT 'Table SafetyChecklistHeadings created';
      END
      ELSE
      BEGIN
          PRINT 'Table SafetyChecklistHeadings already exists';
      END
    `);
    
    // Create SafetyChecklistItems table
    console.log('Creating SafetyChecklistItems table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyChecklistItems')
      BEGIN
          CREATE TABLE SafetyChecklistItems (
              id INT IDENTITY(1,1) PRIMARY KEY,
              tab_id NVARCHAR(50) NOT NULL,
              heading_text NVARCHAR(255) NOT NULL,
              heading_slug NVARCHAR(255) NOT NULL,
              item_text NVARCHAR(1000) NOT NULL,
              options NVARCHAR(500) NOT NULL,
              display_order INT DEFAULT 0,
              created_at DATETIME DEFAULT GETDATE(),
              created_by NVARCHAR(100),
              updated_at DATETIME,
              is_active BIT DEFAULT 1
          );
          PRINT 'Table SafetyChecklistItems created';
      END
      ELSE
      BEGIN
          PRINT 'Table SafetyChecklistItems already exists';
      END
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistHeadings_TabId' AND object_id = OBJECT_ID('SafetyChecklistHeadings'))
      BEGIN
          CREATE INDEX IX_SafetyChecklistHeadings_TabId ON SafetyChecklistHeadings(tab_id);
          PRINT 'Index IX_SafetyChecklistHeadings_TabId created';
      END
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistItems_TabId' AND object_id = OBJECT_ID('SafetyChecklistItems'))
      BEGIN
          CREATE INDEX IX_SafetyChecklistItems_TabId ON SafetyChecklistItems(tab_id, heading_slug);
          PRINT 'Index IX_SafetyChecklistItems_TabId created';
      END
    `);

    console.log('✅ All tables and indexes created successfully!');
    
    await pool.close();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.close();
    process.exit(1);
  }
}

createTables();
