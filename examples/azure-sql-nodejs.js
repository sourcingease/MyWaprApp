// Example: Azure SQL Database integration with Node.js
// This demonstrates how to connect the agent to your Azure SQL Database

const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

class AzureSQLConnector {
  constructor() {
    this.config = {
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'SeApp2',
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      options: {
        encrypt: true, // Always encrypt for Azure SQL
        trustServerCertificate: false,
        connectionTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    // Alternative: Use Azure AD authentication for production
    // Uncomment below and comment above for Azure AD:
    /*
    this.config = {
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'SeApp2',
      authentication: {
        type: 'azure-active-directory-msi-managed-identity',
        options: {
          clientId: process.env.AZURE_CLIENT_ID,
        }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
      }
    };
    */
  }

  async connect() {
    try {
      this.pool = await sql.connect(this.config);
      console.log('Connected to Azure SQL Database');
      return this.pool;
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }

  // Example: Monitor for new records
  async monitorNewRecords(tableName, lastCheckTime) {
    try {
      const request = this.pool.request();
      request.input('lastCheck', sql.DateTime, lastCheckTime);
      
      const result = await request.query(`
        SELECT * FROM ${tableName} 
        WHERE CreatedDate > @lastCheck 
        ORDER BY CreatedDate DESC
      `);
      
      return result.recordset;
    } catch (err) {
      console.error('Monitor query failed:', err);
      throw err;
    }
  }

  // Example: Execute automated maintenance
  async runMaintenanceTask() {
    try {
      const request = this.pool.request();
      
      // Example: Update statistics
      await request.query('UPDATE STATISTICS your_table_name');
      
      // Example: Clean up old records
      const cleanupResult = await request.query(`
        DELETE FROM audit_logs 
        WHERE created_date < DATEADD(day, -30, GETDATE())
      `);
      
      console.log(`Cleaned up ${cleanupResult.rowsAffected} old records`);
      return cleanupResult;
    } catch (err) {
      console.error('Maintenance task failed:', err);
      throw err;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      console.log('Disconnected from Azure SQL Database');
    }
  }
}

// Example agent usage
class SaaSAgent {
  constructor() {
    this.sqlConnector = new AzureSQLConnector();
  }

  async start() {
    await this.sqlConnector.connect();
    
    // Run monitoring every 5 minutes
    setInterval(() => this.performMonitoring(), 5 * 60 * 1000);
    
    // Run maintenance daily
    setInterval(() => this.performMaintenance(), 24 * 60 * 60 * 1000);
    
    console.log('SaaS Agent started with Azure SQL integration');
  }

  async performMonitoring() {
    try {
      const lastCheck = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const newRecords = await this.sqlConnector.monitorNewRecords('user_events', lastCheck);
      
      if (newRecords.length > 0) {
        console.log(`Found ${newRecords.length} new records`);
        // Process each record - send notifications, update other systems, etc.
        for (const record of newRecords) {
          await this.processRecord(record);
        }
      }
    } catch (err) {
      console.error('Monitoring failed:', err);
    }
  }

  async performMaintenance() {
    try {
      console.log('Running maintenance tasks...');
      await this.sqlConnector.runMaintenanceTask();
    } catch (err) {
      console.error('Maintenance failed:', err);
    }
  }

  async processRecord(record) {
    // Example processing logic
    console.log('Processing record:', record.id);
    
    // Could trigger:
    // - Send email notifications
    // - Update external APIs
    // - Generate reports
    // - Sync with other databases
  }
}

module.exports = { SaaSAgent, AzureSQLConnector };