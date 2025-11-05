/**
 * SaaS Agent - Azure SQL Database Integration
 * Main entry point for the agent
 */

require('dotenv').config();
const sql = require('mssql');

class AzureSQLConnector {
  constructor() {
    this.pool = null;
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

    if (!this.config.password) {
      throw new Error('AZURE_SQL_PASSWORD environment variable is required');
    }
  }

  async connect() {
    try {
      // Use an isolated pool instance to avoid interfering with other pools
      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();
      console.log(`✅ Connected to Azure SQL Database: ${this.config.server}/${this.config.database}`);
      return this.pool;
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      throw err;
    }
  }

  async testConnection() {
    try {
      const request = this.pool.request();
      const result = await request.query('SELECT GETDATE() as CurrentTime, DB_NAME() as DatabaseName');
      console.log('🔍 Connection test successful:', result.recordset[0]);
      return result.recordset[0];
    } catch (err) {
      console.error('❌ Connection test failed:', err.message);
      throw err;
    }
  }

  async getTableList() {
    try {
      const request = this.pool.request();
      const result = await request.query(`
        SELECT TABLE_NAME, TABLE_TYPE 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      return result.recordset;
    } catch (err) {
      console.error('❌ Failed to get table list:', err.message);
      throw err;
    }
  }

  async monitorTable(tableName, dateColumn = 'CreatedDate', minutesBack = 5) {
    try {
      const request = this.pool.request();
      request.input('minutesBack', sql.Int, minutesBack);
      
      const query = `
        SELECT COUNT(*) as RecordCount
        FROM [${tableName}] 
        WHERE [${dateColumn}] > DATEADD(minute, -@minutesBack, GETDATE())
      `;
      
      const result = await request.query(query);
      return result.recordset[0];
    } catch (err) {
      console.error(`❌ Failed to monitor table ${tableName}:`, err.message);
      throw err;
    }
  }

  async getRecentRecords(tableName, dateColumn = 'CreatedDate', minutesBack = 5, limit = 10) {
    try {
      const request = this.pool.request();
      request.input('minutesBack', sql.Int, minutesBack);
      request.input('limit', sql.Int, limit);
      
      const query = `
        SELECT TOP(@limit) *
        FROM [${tableName}] 
        WHERE [${dateColumn}] > DATEADD(minute, -@minutesBack, GETDATE())
        ORDER BY [${dateColumn}] DESC
      `;
      
      const result = await request.query(query);
      return result.recordset;
    } catch (err) {
      console.error(`❌ Failed to get recent records from ${tableName}:`, err.message);
      throw err;
    }
  }

  async executeQuery(query, params = {}) {
    try {
      const request = this.pool.request();
      
      // Add parameters if provided
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
      
      const result = await request.query(query);
      return result;
    } catch (err) {
      console.error('❌ Query execution failed:', err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      console.log('🔌 Disconnected from Azure SQL Database');
    }
  }
}

class SaaSAgent {
  constructor() {
    this.sqlConnector = new AzureSQLConnector();
    this.isRunning = false;
    this.monitoringInterval = null;
    this.maintenanceInterval = null;
    
    // Configuration
    this.config = {
      monitoringIntervalMinutes: parseInt(process.env.MONITORING_INTERVAL_MINUTES) || 5,
      maintenanceIntervalHours: parseInt(process.env.MAINTENANCE_INTERVAL_HOURS) || 24,
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    console.log('🤖 SaaS Agent initialized with config:', this.config);
  }

  async start() {
    try {
      console.log('🚀 Starting SaaS Agent...');
      
      // Connect to database
      await this.sqlConnector.connect();
      
      // Test connection
      await this.sqlConnector.testConnection();
      
      // Get available tables
      const tables = await this.sqlConnector.getTableList();
      console.log(`📊 Found ${tables.length} tables in database:`, tables.map(t => t.TABLE_NAME).join(', '));
      
      this.isRunning = true;
      
      // Start monitoring loop
      this.startMonitoring();
      
      // Start maintenance loop  
      this.startMaintenance();
      
      console.log('✅ SaaS Agent started successfully!');
      
      // Keep the process running
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());
      
    } catch (err) {
      console.error('❌ Failed to start SaaS Agent:', err.message);
      process.exit(1);
    }
  }

  startMonitoring() {
    const intervalMs = this.config.monitoringIntervalMinutes * 60 * 1000;
    console.log(`🔍 Starting monitoring loop (every ${this.config.monitoringIntervalMinutes} minutes)`);
    
    // Run immediately, then on interval
    this.performMonitoring();
    this.monitoringInterval = setInterval(() => this.performMonitoring(), intervalMs);
  }

  startMaintenance() {
    const intervalMs = this.config.maintenanceIntervalHours * 60 * 60 * 1000;
    console.log(`🔧 Starting maintenance loop (every ${this.config.maintenanceIntervalHours} hours)`);
    
    // Run maintenance after 1 minute, then on interval
    setTimeout(() => {
      this.performMaintenance();
      this.maintenanceInterval = setInterval(() => this.performMaintenance(), intervalMs);
    }, 60000);
  }

  async performMonitoring() {
    try {
      console.log('🔍 Performing monitoring check...');
      
      // Get list of tables to monitor
      const tables = await this.sqlConnector.getTableList();
      
      for (const table of tables) {
        try {
          // Try to monitor each table (assuming they might have common date columns)
          const commonDateColumns = ['CreatedDate', 'Created', 'DateCreated', 'Timestamp', 'ModifiedDate'];
          
          for (const dateColumn of commonDateColumns) {
            try {
              const monitoring = await this.sqlConnector.monitorTable(
                table.TABLE_NAME, 
                dateColumn, 
                this.config.monitoringIntervalMinutes
              );
              
              if (monitoring.RecordCount > 0) {
                console.log(`📈 Table ${table.TABLE_NAME}: ${monitoring.RecordCount} new records in last ${this.config.monitoringIntervalMinutes} minutes`);
                
                // Get the actual records for processing
                const records = await this.sqlConnector.getRecentRecords(
                  table.TABLE_NAME, 
                  dateColumn, 
                  this.config.monitoringIntervalMinutes
                );
                
                await this.processRecords(table.TABLE_NAME, records);
              }
              break; // Found a valid date column, don't try others
            } catch (columnErr) {
              // Column doesn't exist, try next one
              continue;
            }
          }
        } catch (tableErr) {
          // Table monitoring failed, continue with next table
          console.log(`⚠️ Could not monitor table ${table.TABLE_NAME}: ${tableErr.message}`);
        }
      }
      
    } catch (err) {
      console.error('❌ Monitoring failed:', err.message);
    }
  }

  async performMaintenance() {
    try {
      console.log('🔧 Performing maintenance tasks...');
      
      // Example maintenance tasks
      const result = await this.sqlConnector.executeQuery(`
        SELECT 
          COUNT(*) as TotalRecords,
          DB_NAME() as Database,
          GETDATE() as MaintenanceTime
      `);
      
      console.log('📊 Maintenance report:', result.recordset[0]);
      
    } catch (err) {
      console.error('❌ Maintenance failed:', err.message);
    }
  }

  async processRecords(tableName, records) {
    console.log(`🔄 Processing ${records.length} records from ${tableName}...`);
    
    // Example processing logic
    for (const record of records) {
      console.log(`  📄 Record ID: ${record.Id || record.ID || 'unknown'}`);
      
      // Add your custom processing logic here:
      // - Send notifications
      // - Update other systems
      // - Generate reports
      // - Trigger workflows
    }
  }

  async stop() {
    console.log('🛑 Stopping SaaS Agent...');
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }
    
    await this.sqlConnector.disconnect();
    console.log('✅ SaaS Agent stopped');
    process.exit(0);
  }
}

// Start the agent if this file is run directly
if (require.main === module) {
  const agent = new SaaSAgent();
  agent.start().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { SaaSAgent, AzureSQLConnector };