/**
 * Health Check Script for Azure SQL Database
 * Run this to test your database connection before starting the agent
 */

require('dotenv').config();
const { AzureSQLConnector } = require('../src/index.js');

async function runHealthCheck() {
  console.log('🏥 Starting Azure SQL Database Health Check...\n');
  
  const connector = new AzureSQLConnector();
  
  try {
    // Test 1: Connection
    console.log('1️⃣ Testing database connection...');
    await connector.connect();
    console.log('✅ Connection successful!\n');
    
    // Test 2: Basic query
    console.log('2️⃣ Testing basic query...');
    const connectionTest = await connector.testConnection();
    console.log('✅ Query successful!\n');
    
    // Test 3: List tables
    console.log('3️⃣ Retrieving table information...');
    const tables = await connector.getTableList();
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   📋 ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
    });
    console.log('');
    
    // Test 4: Test monitoring capability on first table (if any)
    if (tables.length > 0) {
      const firstTable = tables[0].TABLE_NAME;
      console.log(`4️⃣ Testing monitoring on table '${firstTable}'...`);
      
      try {
        // Try different common date column names
        const dateColumns = ['CreatedDate', 'Created', 'DateCreated', 'Timestamp', 'ModifiedDate', 'UpdatedAt', 'CreatedAt'];
        let foundDateColumn = null;
        
        for (const dateColumn of dateColumns) {
          try {
            const monitoring = await connector.monitorTable(firstTable, dateColumn, 1440); // Check last 24 hours
            console.log(`✅ Monitoring test successful with column '${dateColumn}': ${monitoring.RecordCount} records in last 24 hours`);
            foundDateColumn = dateColumn;
            break;
          } catch (err) {
            // Column doesn't exist, try next one
            continue;
          }
        }
        
        if (!foundDateColumn) {
          console.log('⚠️ No common date column found for monitoring. You may need to customize the monitoring logic for your tables.');
        }
        
      } catch (err) {
        console.log(`⚠️ Monitoring test failed: ${err.message}`);
        console.log('   This is normal if the table doesn\'t have standard date columns.');
      }
    } else {
      console.log('4️⃣ No tables found to test monitoring functionality.');
    }
    
    console.log('\n🎉 All health checks completed!');
    console.log('\n📋 Summary:');
    console.log(`   Database: ${connectionTest.DatabaseName}`);
    console.log(`   Server: zlnsw9feuf.database.windows.net`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Connection Time: ${connectionTest.CurrentTime}`);
    
    console.log('\n✅ Your agent is ready to connect to Azure SQL Database!');
    console.log('   To start the agent, run: npm start');
    
  } catch (error) {
    console.error('\n❌ Health check failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('AZURE_SQL_PASSWORD')) {
      console.log('\n💡 Quick fix:');
      console.log('   1. Copy .env.template to .env');
      console.log('   2. Set your AZURE_SQL_PASSWORD in the .env file');
    } else if (error.message.includes('Login failed')) {
      console.log('\n💡 Authentication issue:');
      console.log('   - Check your username and password');
      console.log('   - Ensure the user "turtle" exists and has proper permissions');
    } else if (error.message.includes('Cannot open server')) {
      console.log('\n💡 Network/Firewall issue:');
      console.log('   - Check if your IP is allowed in Azure SQL firewall');
      console.log('   - Verify the server name: zlnsw9feuf.database.windows.net');
    }
    
    process.exit(1);
  } finally {
    await connector.disconnect();
  }
}

// Run the health check
runHealthCheck().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});