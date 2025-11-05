/**
 * Setup Safety Officer Database Tables
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

async function setupSafetyTables() {
  let pool;
  
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');

    // Create Incidents Table
    console.log('\n📋 Creating Incidents table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyIncidents')
      CREATE TABLE SafetyIncidents (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        IncidentDate DATETIME NOT NULL,
        IncidentType NVARCHAR(100) NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        Department NVARCHAR(100),
        Description NVARCHAR(MAX),
        InjuryOccurred NVARCHAR(10),
        PropertyDamage NVARCHAR(10),
        Severity NVARCHAR(50),
        ReportedBy NVARCHAR(100),
        InvestigationStatus NVARCHAR(50),
        CorrectiveAction NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'Open',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Incidents table created');

    // Create Grievances Table
    console.log('\n📋 Creating Grievances table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyGrievances')
      CREATE TABLE SafetyGrievances (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        GrievanceDate DATETIME NOT NULL,
        ComplainantName NVARCHAR(100),
        ComplainantRole NVARCHAR(100),
        GrievanceType NVARCHAR(100) NOT NULL,
        Category NVARCHAR(100),
        Description NVARCHAR(MAX),
        Priority NVARCHAR(50),
        AssignedTo NVARCHAR(100),
        ResolutionDetails NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'Pending',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Grievances table created');

    // Create Fire Safety Table
    console.log('\n📋 Creating Fire Safety table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FireSafety')
      CREATE TABLE FireSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        EquipmentType NVARCHAR(100),
        EquipmentId NVARCHAR(100),
        FireExtinguishersCount INT,
        FireExtinguishersWorking NVARCHAR(10),
        SmokeDetectorsCount INT,
        SmokeDetectorsWorking NVARCHAR(10),
        FireAlarmsWorking NVARCHAR(10),
        EmergencyExitsClear NVARCHAR(10),
        FireDrillConducted NVARCHAR(10),
        LastDrillDate DATETIME,
        Deficiencies NVARCHAR(MAX),
        CorrectiveActions NVARCHAR(MAX),
        InspectedBy NVARCHAR(100),
        Status NVARCHAR(50) DEFAULT 'Compliant',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Fire Safety table created');

    // Create Electrical Safety Table
    console.log('\n📋 Creating Electrical Safety table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ElectricalSafety')
      CREATE TABLE ElectricalSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        EquipmentType NVARCHAR(100),
        EquipmentId NVARCHAR(100),
        Voltage NVARCHAR(50),
        WiringCondition NVARCHAR(50),
        GroundingStatus NVARCHAR(10),
        CircuitBreakersWorking NVARCHAR(10),
        ElectricalPanelCondition NVARCHAR(50),
        EmergencyShutoffAccessible NVARCHAR(10),
        LabelingComplete NVARCHAR(10),
        Deficiencies NVARCHAR(MAX),
        CorrectiveActions NVARCHAR(MAX),
        InspectedBy NVARCHAR(100),
        Status NVARCHAR(50) DEFAULT 'Compliant',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Electrical Safety table created');

    // Create Structural Safety Table
    console.log('\n📋 Creating Structural Safety table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StructuralSafety')
      CREATE TABLE StructuralSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        StructureType NVARCHAR(100),
        FloorCondition NVARCHAR(50),
        WallCondition NVARCHAR(50),
        CeilingCondition NVARCHAR(50),
        StaircaseCondition NVARCHAR(50),
        RailingsSecure NVARCHAR(10),
        CracksVisible NVARCHAR(10),
        WaterLeakage NVARCHAR(10),
        LoadBearingCapacity NVARCHAR(50),
        Deficiencies NVARCHAR(MAX),
        CorrectiveActions NVARCHAR(MAX),
        InspectedBy NVARCHAR(100),
        Status NVARCHAR(50) DEFAULT 'Safe',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Structural Safety table created');

    // Create Health Hazards Table
    console.log('\n📋 Creating Health Hazards table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthHazards')
      CREATE TABLE HealthHazards (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AssessmentDate DATETIME NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        HazardType NVARCHAR(100),
        ChemicalExposure NVARCHAR(10),
        ChemicalNames NVARCHAR(MAX),
        NoiseLevel NVARCHAR(50),
        VentilationAdequate NVARCHAR(10),
        PPEAvailable NVARCHAR(10),
        PPETypes NVARCHAR(MAX),
        FirstAidAvailable NVARCHAR(10),
        WashStationsAccessible NVARCHAR(10),
        HazardSeverity NVARCHAR(50),
        RiskLevel NVARCHAR(50),
        Deficiencies NVARCHAR(MAX),
        CorrectiveActions NVARCHAR(MAX),
        AssessedBy NVARCHAR(100),
        Status NVARCHAR(50) DEFAULT 'Under Review',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ Health Hazards table created');

    console.log('\n✅ All Safety Officer tables created successfully!');
    
  } catch (err) {
    console.error('❌ Error setting up tables:', err.message);
    console.error(err);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the setup
setupSafetyTables();
