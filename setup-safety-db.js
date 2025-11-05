/**
 * Setup Safety Database Tables
 * Run this script to create all necessary safety tables
 */

require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function setupSafetyDatabase() {
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

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'src', 'create-safety-tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('🔄 Creating safety tables...');
    
    // Execute the SQL script
    await pool.request().query(sqlScript);
    
    console.log('✅ All safety tables created successfully!');
    
    // Verify tables exist
    const verifyQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE 'Safety%'
      ORDER BY TABLE_NAME
    `;
    
    const result = await pool.request().query(verifyQuery);
    console.log('\n📋 Safety tables in database:');
    result.recordset.forEach(row => {
      console.log(`  ✓ ${row.TABLE_NAME}`);
    });
    
    await pool.close();
    console.log('\n✅ Database setup complete!');
    
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

// Run the setup
setupSafetyDatabase();
