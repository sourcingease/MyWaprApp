-- Additional Safety Tables for Incidents and Grievances
USE Complytex;
GO

-- SafetyIncidents Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyIncidents')
BEGIN
    CREATE TABLE SafetyIncidents (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        IncidentDate DATETIME NOT NULL,
        IncidentType NVARCHAR(100) NULL,
        Location NVARCHAR(255) NULL,
        Department NVARCHAR(100) NULL,
        Description NVARCHAR(MAX) NULL,
        InjuryOccurred NVARCHAR(10) NULL,
        PropertyDamage NVARCHAR(10) NULL,
        Severity NVARCHAR(50) NULL,
        ReportedBy NVARCHAR(255) NULL,
        InvestigationStatus NVARCHAR(50) NULL,
        CorrectiveAction NVARCHAR(MAX) NULL,
        Status NVARCHAR(50) DEFAULT 'Open',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table SafetyIncidents created successfully.';
END
GO

-- SafetyGrievances Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SafetyGrievances')
BEGIN
    CREATE TABLE SafetyGrievances (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        GrievanceDate DATETIME NOT NULL,
        ComplainantName NVARCHAR(255) NULL,
        ComplainantRole NVARCHAR(100) NULL,
        GrievanceType NVARCHAR(100) NULL,
        Category NVARCHAR(100) NULL,
        Description NVARCHAR(MAX) NULL,
        Priority NVARCHAR(50) NULL,
        AssignedTo NVARCHAR(255) NULL,
        ResolutionDetails NVARCHAR(MAX) NULL,
        Status NVARCHAR(50) DEFAULT 'Pending',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table SafetyGrievances created successfully.';
END
GO

-- FireSafety Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FireSafety')
BEGIN
    CREATE TABLE FireSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NULL,
        EquipmentType NVARCHAR(100) NULL,
        EquipmentId NVARCHAR(100) NULL,
        FireExtinguishersCount INT NULL,
        FireExtinguishersWorking NVARCHAR(10) NULL,
        SmokeDetectorsCount INT NULL,
        SmokeDetectorsWorking NVARCHAR(10) NULL,
        FireAlarmsWorking NVARCHAR(10) NULL,
        EmergencyExitsClear NVARCHAR(10) NULL,
        FireDrillConducted NVARCHAR(10) NULL,
        LastDrillDate DATETIME NULL,
        Deficiencies NVARCHAR(MAX) NULL,
        CorrectiveActions NVARCHAR(MAX) NULL,
        InspectedBy NVARCHAR(255) NULL,
        Status NVARCHAR(50) DEFAULT 'Compliant',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table FireSafety created successfully.';
END
GO

-- ElectricalSafety Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ElectricalSafety')
BEGIN
    CREATE TABLE ElectricalSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NULL,
        EquipmentType NVARCHAR(100) NULL,
        EquipmentId NVARCHAR(100) NULL,
        Voltage NVARCHAR(50) NULL,
        WiringCondition NVARCHAR(50) NULL,
        GroundingStatus NVARCHAR(50) NULL,
        CircuitBreakersWorking NVARCHAR(10) NULL,
        ElectricalPanelCondition NVARCHAR(50) NULL,
        EmergencyShutoffAccessible NVARCHAR(10) NULL,
        LabelingComplete NVARCHAR(10) NULL,
        Deficiencies NVARCHAR(MAX) NULL,
        CorrectiveActions NVARCHAR(MAX) NULL,
        InspectedBy NVARCHAR(255) NULL,
        Status NVARCHAR(50) DEFAULT 'Compliant',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table ElectricalSafety created successfully.';
END
GO

-- StructuralSafety Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StructuralSafety')
BEGIN
    CREATE TABLE StructuralSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL,
        Location NVARCHAR(255) NULL,
        StructureType NVARCHAR(100) NULL,
        FloorCondition NVARCHAR(50) NULL,
        WallCondition NVARCHAR(50) NULL,
        CeilingCondition NVARCHAR(50) NULL,
        StaircaseCondition NVARCHAR(50) NULL,
        RailingsSecure NVARCHAR(10) NULL,
        CracksVisible NVARCHAR(10) NULL,
        WaterLeakage NVARCHAR(10) NULL,
        LoadBearingCapacity NVARCHAR(50) NULL,
        Deficiencies NVARCHAR(MAX) NULL,
        CorrectiveActions NVARCHAR(MAX) NULL,
        InspectedBy NVARCHAR(255) NULL,
        Status NVARCHAR(50) DEFAULT 'Safe',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table StructuralSafety created successfully.';
END
GO

-- HealthHazards Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthHazards')
BEGIN
    CREATE TABLE HealthHazards (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AssessmentDate DATETIME NOT NULL,
        Location NVARCHAR(255) NULL,
        HazardType NVARCHAR(100) NULL,
        ChemicalExposure NVARCHAR(10) NULL,
        ChemicalNames NVARCHAR(MAX) NULL,
        NoiseLevel NVARCHAR(50) NULL,
        VentilationAdequate NVARCHAR(10) NULL,
        PPEAvailable NVARCHAR(10) NULL,
        PPETypes NVARCHAR(MAX) NULL,
        FirstAidAvailable NVARCHAR(10) NULL,
        WashStationsAccessible NVARCHAR(10) NULL,
        HazardSeverity NVARCHAR(50) NULL,
        RiskLevel NVARCHAR(50) NULL,
        Deficiencies NVARCHAR(MAX) NULL,
        CorrectiveActions NVARCHAR(MAX) NULL,
        AssessedBy NVARCHAR(255) NULL,
        Status NVARCHAR(50) DEFAULT 'Under Review',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table HealthHazards created successfully.';
END
GO

PRINT 'All additional safety tables created successfully!';
