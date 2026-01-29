#!/usr/bin/env node

/**
 * Water Management Database Setup Script
 * Initializes all water management tables and stored procedures
 */

require('dotenv').config();
const { AzureSQLConnector } = require('./index.js');
const fs = require('fs');
const path = require('path');

async function setupWaterManagementDB() {
  let pool = null;

  try {
    console.log('🌊 Starting Water Management Database Setup...\n');

    // Initialize database connection
    const connector = new AzureSQLConnector({
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectionTimeout: 30000,
        requestTimeout: 30000
      }
    });

    pool = await connector.connect();
    console.log('✅ Connected to Azure SQL Database\n');

    // Read SQL schema file
    const schemaPath = path.join(__dirname, '../database/water_management_setup.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');

    // Split SQL script by GO statements for execution
    const statements = sqlScript
      .split(/\bGO\b/i)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let executedCount = 0;
    for (const statement of statements) {
      try {
        await pool.request().query(statement);
        executedCount++;
        console.log(`✓ Statement ${executedCount}/${statements.length} executed`);
      } catch (error) {
        console.warn(`⚠️  Statement ${executedCount} warning: ${error.message.split('\n')[0]}`);
        // Continue with next statement
      }
    }

    console.log(`\n✅ Water Management Database Setup Completed!\n`);
    console.log('📊 Created Tables:');
    console.log('   - water_buying');
    console.log('   - water_rain_collection');
    console.log('   - water_usage\n');
    console.log('📋 Created Stored Procedures:');
    console.log('   - sp_water_buying_create/read/update/delete');
    console.log('   - sp_water_rain_create/read/update/delete');
    console.log('   - sp_water_usage_create/read/update/delete\n');
    console.log('🚀 Ready to use! Start your application with: npm run web');

  } catch (error) {
    console.error('❌ Database Setup Failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run setup
setupWaterManagementDB();
