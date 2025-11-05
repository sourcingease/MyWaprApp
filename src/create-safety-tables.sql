-- Safety Tables for ComplytEX Application
-- Run this script to create all necessary tables

-- ==================== USC-SAFE ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyUSCSafe')
CREATE TABLE SafetyUSCSafe (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX), -- JSON format for all checklist responses
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== FIRE SAFETY ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyFireSafety')
CREATE TABLE SafetyFireSafety (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== ELECTRICAL SAFETY ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyElectrical')
CREATE TABLE SafetyElectrical (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    InspectionDate DATE,
    Location NVARCHAR(500),
    InspectedBy NVARCHAR(255),
    FormData NVARCHAR(MAX),
    Status NVARCHAR(50),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== STRUCTURAL SAFETY ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyStructural')
CREATE TABLE SafetyStructural (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    InspectionDate DATE,
    Location NVARCHAR(500),
    StructureType NVARCHAR(255),
    InspectedBy NVARCHAR(255),
    FormData NVARCHAR(MAX),
    Status NVARCHAR(50),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== HEALTH HAZARDS ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyHealthHazards')
CREATE TABLE SafetyHealthHazards (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    AssessmentDate DATE,
    Location NVARCHAR(500),
    AssessedBy NVARCHAR(255),
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== GAS SAFETY ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyGasSafety')
CREATE TABLE SafetyGasSafety (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== BOILER SAFETY ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyBoilerSafety')
CREATE TABLE SafetyBoilerSafety (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== CONSULTANT ENGAGEMENT ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyConsultant')
CREATE TABLE SafetyConsultant (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== DSA ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyDSA')
CREATE TABLE SafetyDSA (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== EMERGENCY POWER ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyEmergencyPower')
CREATE TABLE SafetyEmergencyPower (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== SAFETY TRAINING ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetySafetyTraining')
CREATE TABLE SafetySafetyTraining (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

-- ==================== UNGP CHECKLIST ====================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyUNGP')
CREATE TABLE SafetyUNGP (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TenantId INT,
    FormData NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    CreatedDate DATETIME DEFAULT GETDATE(),
    UpdatedDate DATETIME DEFAULT GETDATE()
);

PRINT 'All safety tables created successfully!';
