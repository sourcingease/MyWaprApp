const sql = require('mssql');

async function createChecklistTables() {
  try {
    const config = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_NAME || 'ComplytEX',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'YourPassword123',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    };

    console.log('Connecting to database...');
    await sql.connect(config);
    console.log('✅ Connected to database');

    const query = `
      -- Safety Checklist Custom Headings Table
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
          PRINT 'Table SafetyChecklistHeadings created successfully';
      END
      ELSE
      BEGIN
          PRINT 'Table SafetyChecklistHeadings already exists';
      END

      -- Safety Checklist Custom Items Table
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
          PRINT 'Table SafetyChecklistItems created successfully';
      END
      ELSE
      BEGIN
          PRINT 'Table SafetyChecklistItems already exists';
      END

      -- Create indexes for better performance
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistHeadings_TabId')
      BEGIN
          CREATE INDEX IX_SafetyChecklistHeadings_TabId ON SafetyChecklistHeadings(tab_id);
          PRINT 'Index IX_SafetyChecklistHeadings_TabId created';
      END

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistItems_TabHeading')
      BEGIN
          CREATE INDEX IX_SafetyChecklistItems_TabHeading ON SafetyChecklistItems(tab_id, heading_slug);
          PRINT 'Index IX_SafetyChecklistItems_TabHeading created';
      END
    `;

    console.log('Creating tables...');
    await sql.query(query);
    console.log('✅ Tables created successfully!');

    await sql.close();
    console.log('✅ Database connection closed');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createChecklistTables();
