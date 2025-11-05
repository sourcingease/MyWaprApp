-- =============================================
-- Safety Officer Dashboard - Additional Tables and Stored Procedures
-- Created: 2025-10-24
-- =============================================

USE ComplytEX;
GO

-- =============================================
-- 1. GAS SAFETY TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GasSafety')
BEGIN
    CREATE TABLE GasSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL DEFAULT GETDATE(),
        FactoryId INT NULL,
        Location NVARCHAR(255) NULL,
        InspectedBy NVARCHAR(100) NULL,
        
        -- Worker Safety
        WorkerSafety NVARCHAR(10) NULL,
        ExplosionControls NVARCHAR(10) NULL,
        
        -- Prohibited Storage
        ProhibitedStorage NVARCHAR(10) NULL,
        NFPAStandard NVARCHAR(10) NULL,
        TechnicalGuidance NVARCHAR(10) NULL,
        
        -- Safe Storage Practices
        SafeStorage NVARCHAR(10) NULL,
        
        -- Transitional Guidance
        TransitionalStorage NVARCHAR(10) NULL,
        TransitionalCompliance NVARCHAR(10) NULL,
        
        -- Gas Canister Room
        RoomEnclosed NVARCHAR(10) NULL,
        FireDoors NVARCHAR(10) NULL,
        VerifiedCompliant NVARCHAR(10) NULL,
        OngoingCompliance NVARCHAR(10) NULL,
        
        -- Storage Building
        BuildingDistance NVARCHAR(10) NULL,
        ExteriorWalls NVARCHAR(10) NULL,
        DoorsRating NVARCHAR(10) NULL,
        BuildingSoleUse NVARCHAR(10) NULL,
        VentilationInstalled NVARCHAR(10) NULL,
        BuildingApproved NVARCHAR(10) NULL,
        
        -- Storage Condition
        CylindersStoredCondition NVARCHAR(10) NULL,
        CylindersKeptAway NVARCHAR(10) NULL,
        CylindersUpright NVARCHAR(10) NULL,
        CylindersSecured NVARCHAR(10) NULL,
        ValveProtection NVARCHAR(10) NULL,
        FullEmptySeparation NVARCHAR(10) NULL,
        EmptyCylindersMarked NVARCHAR(10) NULL,
        
        -- Connection & Operation
        ProperlySized NVARCHAR(10) NULL,
        NoLeaks NVARCHAR(10) NULL,
        RegularlyInspected NVARCHAR(10) NULL,
        ApprovedConnections NVARCHAR(10) NULL,
        NoToolsValves NVARCHAR(10) NULL,
        
        -- Inspection & Testing
        HydrostaticTesting NVARCHAR(10) NULL,
        CylindersChecked NVARCHAR(10) NULL,
        
        -- Handling & Leaks
        CylindersMovedTrucks NVARCHAR(10) NULL,
        LeakingTagged NVARCHAR(10) NULL,
        LeakingMoved NVARCHAR(10) NULL,
        WarningSignsPosted NVARCHAR(10) NULL,
        SupplierNotified NVARCHAR(10) NULL,
        
        -- Inspection & Reporting
        InspectionsProtocols NVARCHAR(10) NULL,
        CAPsPrepared NVARCHAR(10) NULL,
        ReportsDocumented NVARCHAR(10) NULL,
        
        -- Additional Notes
        Observations NVARCHAR(MAX) NULL,
        CorrectiveActions NVARCHAR(MAX) NULL,
        
        Status NVARCHAR(50) DEFAULT 'Open',
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table GasSafety created successfully.';
END
GO

-- =============================================
-- 2. BOILER SAFETY TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BoilerSafety')
BEGIN
    CREATE TABLE BoilerSafety (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL DEFAULT GETDATE(),
        FactoryId INT NULL,
        Location NVARCHAR(255) NULL,
        InspectedBy NVARCHAR(100) NULL,
        
        -- Requirements
        SafetyProgramme NVARCHAR(10) NULL,
        FactoryCollaboration NVARCHAR(10) NULL,
        BoilerDesign NVARCHAR(10) NULL,
        BoilerInspection NVARCHAR(10) NULL,
        InspectionVerifies NVARCHAR(10) NULL,
        RapidDepressurization NVARCHAR(10) NULL,
        NameplateVisible NVARCHAR(10) NULL,
        FireOutlets NVARCHAR(10) NULL,
        LowWaterIndicator NVARCHAR(10) NULL,
        MaintenanceLogbook NVARCHAR(10) NULL,
        DesignManuals NVARCHAR(10) NULL,
        CertifiedEngineers NVARCHAR(10) NULL,
        SafetyDepartment NVARCHAR(10) NULL,
        EngineersTrained NVARCHAR(10) NULL,
        AdvancedTraining NVARCHAR(10) NULL,
        PracticalTraining NVARCHAR(10) NULL,
        
        -- Water Source
        WaterSource NVARCHAR(50) NULL,
        WaterStorageTank INT NULL,
        WaterSoftener NVARCHAR(100) NULL,
        BoilerPressure DECIMAL(10,2) NULL,
        WaterLevel NVARCHAR(50) NULL,
        Temperature DECIMAL(10,2) NULL,
        
        -- Chemical Treatment
        ChemicalUsed NVARCHAR(10) NULL,
        ChemicalType NVARCHAR(100) NULL,
        DosageRate DECIMAL(10,2) NULL,
        FeedMethod NVARCHAR(100) NULL,
        
        -- Water Quality
        pH DECIMAL(10,2) NULL,
        Alkalinity INT NULL,
        Hardness INT NULL,
        Chlorides INT NULL,
        Silica INT NULL,
        DissolvedSolids INT NULL,
        
        -- Blowdown
        BlowdownFrequency NVARCHAR(50) NULL,
        BlowdownMethod NVARCHAR(100) NULL,
        
        -- Steam Distribution
        SteamPressure DECIMAL(10,2) NULL,
        SteamTemperature DECIMAL(10,2) NULL,
        SteamTraps NVARCHAR(10) NULL,
        Insulation NVARCHAR(10) NULL,
        
        -- Condensate System
        CondensateReturn NVARCHAR(10) NULL,
        CondensateTank NVARCHAR(10) NULL,
        CondensatePump NVARCHAR(10) NULL,
        
        -- Boiler Room
        Ventilation NVARCHAR(10) NULL,
        Lighting NVARCHAR(10) NULL,
        ExhaustFan NVARCHAR(10) NULL,
        ExhaustDuct NVARCHAR(10) NULL,
        StackTempSensor NVARCHAR(10) NULL,
        
        -- Boiler Safety
        SafetyValves NVARCHAR(10) NULL,
        PressureGauge NVARCHAR(10) NULL,
        LowWaterCutoff NVARCHAR(10) NULL,
        FlameSafeguard NVARCHAR(10) NULL,
        EmergencyShutoff NVARCHAR(10) NULL,
        FuelTrainShutoff NVARCHAR(10) NULL,
        InterlockOvertemperature NVARCHAR(10) NULL,
        InterlockLowWater NVARCHAR(10) NULL,
        InterlockFlameFailure NVARCHAR(10) NULL,
        ReliefValvePressure DECIMAL(10,2) NULL,
        
        -- Additional Notes
        Observations NVARCHAR(MAX) NULL,
        
        Status NVARCHAR(50) DEFAULT 'Open',
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table BoilerSafety created successfully.';
END
GO

-- =============================================
-- 3. CONSULTANT ENGAGEMENT TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConsultantEngagement')
BEGIN
    CREATE TABLE ConsultantEngagement (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AssessmentDate DATETIME NOT NULL DEFAULT GETDATE(),
        ConsultantName NVARCHAR(255) NULL,
        ProjectName NVARCHAR(255) NULL,
        AssessedBy NVARCHAR(100) NULL,
        
        -- Legal & Professional Standing
        LegalRegistered NVARCHAR(10) NULL,
        ValidLicenses NVARCHAR(10) NULL,
        InternationalMemberships NVARCHAR(10) NULL,
        
        -- Integrity & Ethical Practice
        NoFalseClaims NVARCHAR(10) NULL,
        IndependentVerification NVARCHAR(10) NULL,
        NoConflictInterest NVARCHAR(10) NULL,
        
        -- Project Team Accountability
        CVsProvided NVARCHAR(10) NULL,
        KeyPersonnelIdentified NVARCHAR(10) NULL,
        ResponsibilitiesDefined NVARCHAR(10) NULL,
        
        -- Contract & Deliverable Management
        ScopeOfWorkDefined NVARCHAR(10) NULL,
        DeliverablesSpecified NVARCHAR(10) NULL,
        TimelineRealistic NVARCHAR(10) NULL,
        PaymentTermsClear NVARCHAR(10) NULL,
        
        -- Testing Oversight & Financial Safeguards
        TestingIndependent NVARCHAR(10) NULL,
        InsuranceCoverage NVARCHAR(10) NULL,
        WarrantyProvided NVARCHAR(10) NULL,
        
        -- Additional Notes
        Comments NVARCHAR(MAX) NULL,
        
        Status NVARCHAR(50) DEFAULT 'Under Review',
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table ConsultantEngagement created successfully.';
END
GO

-- =============================================
-- 4. DSA (Detailed Structural Assessment) TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DSA')
BEGIN
    CREATE TABLE DSA (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AssessmentDate DATETIME NOT NULL DEFAULT GETDATE(),
        FactoryId INT NULL,
        Location NVARCHAR(255) NULL,
        AssessedBy NVARCHAR(100) NULL,
        
        -- Inspection & Documentation
        BulkDrawings NVARCHAR(10) NULL,
        SiteInspection NVARCHAR(10) NULL,
        VisualChecks NVARCHAR(10) NULL,
        MissingDocs NVARCHAR(10) NULL,
        NDTTesting NVARCHAR(10) NULL,
        
        -- Structural Analysis
        AnalyticalModel NVARCHAR(10) NULL,
        CapacityVerified NVARCHAR(10) NULL,
        LoadPaths NVARCHAR(10) NULL,
        AdequacyChecked NVARCHAR(10) NULL,
        
        -- Additional Notes
        Observations NVARCHAR(MAX) NULL,
        
        Status NVARCHAR(50) DEFAULT 'In Progress',
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table DSA created successfully.';
END
GO

-- =============================================
-- 5. EMERGENCY POWER TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmergencyPower')
BEGIN
    CREATE TABLE EmergencyPower (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InspectionDate DATETIME NOT NULL DEFAULT GETDATE(),
        FactoryId INT NULL,
        Location NVARCHAR(255) NULL,
        InspectedBy NVARCHAR(100) NULL,
        
        -- Fire & Life-Safety
        SitePlan NVARCHAR(10) NULL,
        EgressLayout NVARCHAR(10) NULL,
        FloorPlans NVARCHAR(10) NULL,
        Elevations NVARCHAR(10) NULL,
        RoofPlan NVARCHAR(10) NULL,
        PumpRoomFireResistance NVARCHAR(10) NULL,
        PumpRoomOpenlined NVARCHAR(10) NULL,
        PumpSelection NVARCHAR(10) NULL,
        PumpRoomVentilation NVARCHAR(10) NULL,
        DrainageSump NVARCHAR(10) NULL,
        Clearances NVARCHAR(10) NULL,
        ComponentsListed NVARCHAR(10) NULL,
        StandardDetails NVARCHAR(10) NULL,
        FireDoors NVARCHAR(10) NULL,
        PipeSizes NVARCHAR(10) NULL,
        NoCombustibles NVARCHAR(10) NULL,
        
        -- Structural & Architectural Safety
        StructureVerified NVARCHAR(10) NULL,
        LiveLoads NVARCHAR(10) NULL,
        WindLoads NVARCHAR(10) NULL,
        SeismicChecked NVARCHAR(10) NULL,
        DimensionsVerified NVARCHAR(10) NULL,
        VisualInspection NVARCHAR(10) NULL,
        FoundationVerified NVARCHAR(10) NULL,
        StructuralCalculations NVARCHAR(10) NULL,
        RoofDesign NVARCHAR(10) NULL,
        FireResistance NVARCHAR(10) NULL,
        NonstructuralBraced NVARCHAR(10) NULL,
        FloorLoadLimits NVARCHAR(10) NULL,
        EquipmentFoundations NVARCHAR(10) NULL,
        Anchoring NVARCHAR(10) NULL,
        BatteryFireRooms NVARCHAR(10) NULL,
        DoorHung NVARCHAR(10) NULL,
        LightWorkingSpace NVARCHAR(10) NULL,
        PenetrationsSealed NVARCHAR(10) NULL,
        
        -- Electrical & Control Safety
        SingleLineDiagram NVARCHAR(10) NULL,
        BackupPowerSized NVARCHAR(10) NULL,
        AutomaticStart NVARCHAR(10) NULL,
        ATSUPSIsolation NVARCHAR(10) NULL,
        CircuitBreakers NVARCHAR(10) NULL,
        ElectricalComponentsListed NVARCHAR(10) NULL,
        CablesSized NVARCHAR(10) NULL,
        EarthingGrounding NVARCHAR(10) NULL,
        SurgeProtection NVARCHAR(10) NULL,
        EmergencyLighting NVARCHAR(10) NULL,
        SupervisoryAlarms NVARCHAR(10) NULL,
        
        -- Ventilation / Environmental & Battery Safety
        DedicatedBatteryRoom NVARCHAR(10) NULL,
        BatteryVentilation NVARCHAR(10) NULL,
        RoomDoorVents NVARCHAR(10) NULL,
        BatteryTemperature NVARCHAR(10) NULL,
        SpillContainment NVARCHAR(10) NULL,
        BatteryRacks NVARCHAR(10) NULL,
        EyewashStation NVARCHAR(10) NULL,
        SmokeHeatDetectors NVARCHAR(10) NULL,
        EmergencyLightingBatteryRoom NVARCHAR(10) NULL,
        ClearAccess NVARCHAR(10) NULL,
        
        -- Additional Notes
        AdditionalNotes NVARCHAR(MAX) NULL,
        
        Status NVARCHAR(50) DEFAULT 'Pending Review',
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table EmergencyPower created successfully.';
END
GO

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- =============================================
-- SP: Insert Gas Safety Record
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertGasSafety')
    DROP PROCEDURE sp_InsertGasSafety;
GO

CREATE PROCEDURE sp_InsertGasSafety
    @InspectionDate DATETIME,
    @FactoryId INT = NULL,
    @Location NVARCHAR(255) = NULL,
    @InspectedBy NVARCHAR(100) = NULL,
    @WorkerSafety NVARCHAR(10) = NULL,
    @ExplosionControls NVARCHAR(10) = NULL,
    @ProhibitedStorage NVARCHAR(10) = NULL,
    @NFPAStandard NVARCHAR(10) = NULL,
    @TechnicalGuidance NVARCHAR(10) = NULL,
    @SafeStorage NVARCHAR(10) = NULL,
    @TransitionalStorage NVARCHAR(10) = NULL,
    @TransitionalCompliance NVARCHAR(10) = NULL,
    @RoomEnclosed NVARCHAR(10) = NULL,
    @FireDoors NVARCHAR(10) = NULL,
    @VerifiedCompliant NVARCHAR(10) = NULL,
    @OngoingCompliance NVARCHAR(10) = NULL,
    @BuildingDistance NVARCHAR(10) = NULL,
    @ExteriorWalls NVARCHAR(10) = NULL,
    @DoorsRating NVARCHAR(10) = NULL,
    @BuildingSoleUse NVARCHAR(10) = NULL,
    @VentilationInstalled NVARCHAR(10) = NULL,
    @BuildingApproved NVARCHAR(10) = NULL,
    @Observations NVARCHAR(MAX) = NULL,
    @CorrectiveActions NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO GasSafety (
        InspectionDate, FactoryId, Location, InspectedBy,
        WorkerSafety, ExplosionControls, ProhibitedStorage, NFPAStandard,
        TechnicalGuidance, SafeStorage, TransitionalStorage, TransitionalCompliance,
        RoomEnclosed, FireDoors, VerifiedCompliant, OngoingCompliance,
        BuildingDistance, ExteriorWalls, DoorsRating, BuildingSoleUse,
        VentilationInstalled, BuildingApproved, Observations, CorrectiveActions
    )
    VALUES (
        @InspectionDate, @FactoryId, @Location, @InspectedBy,
        @WorkerSafety, @ExplosionControls, @ProhibitedStorage, @NFPAStandard,
        @TechnicalGuidance, @SafeStorage, @TransitionalStorage, @TransitionalCompliance,
        @RoomEnclosed, @FireDoors, @VerifiedCompliant, @OngoingCompliance,
        @BuildingDistance, @ExteriorWalls, @DoorsRating, @BuildingSoleUse,
        @VentilationInstalled, @BuildingApproved, @Observations, @CorrectiveActions
    );
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

-- =============================================
-- SP: Insert Boiler Safety Record
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertBoilerSafety')
    DROP PROCEDURE sp_InsertBoilerSafety;
GO

CREATE PROCEDURE sp_InsertBoilerSafety
    @InspectionDate DATETIME,
    @FactoryId INT = NULL,
    @Location NVARCHAR(255) = NULL,
    @InspectedBy NVARCHAR(100) = NULL,
    @SafetyProgramme NVARCHAR(10) = NULL,
    @FactoryCollaboration NVARCHAR(10) = NULL,
    @BoilerDesign NVARCHAR(10) = NULL,
    @WaterSource NVARCHAR(50) = NULL,
    @BoilerPressure DECIMAL(10,2) = NULL,
    @Temperature DECIMAL(10,2) = NULL,
    @Observations NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO BoilerSafety (
        InspectionDate, FactoryId, Location, InspectedBy,
        SafetyProgramme, FactoryCollaboration, BoilerDesign,
        WaterSource, BoilerPressure, Temperature, Observations
    )
    VALUES (
        @InspectionDate, @FactoryId, @Location, @InspectedBy,
        @SafetyProgramme, @FactoryCollaboration, @BoilerDesign,
        @WaterSource, @BoilerPressure, @Temperature, @Observations
    );
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

-- =============================================
-- SP: Insert Consultant Engagement Record
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertConsultantEngagement')
    DROP PROCEDURE sp_InsertConsultantEngagement;
GO

CREATE PROCEDURE sp_InsertConsultantEngagement
    @AssessmentDate DATETIME,
    @ConsultantName NVARCHAR(255) = NULL,
    @ProjectName NVARCHAR(255) = NULL,
    @AssessedBy NVARCHAR(100) = NULL,
    @LegalRegistered NVARCHAR(10) = NULL,
    @ValidLicenses NVARCHAR(10) = NULL,
    @Comments NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO ConsultantEngagement (
        AssessmentDate, ConsultantName, ProjectName, AssessedBy,
        LegalRegistered, ValidLicenses, Comments
    )
    VALUES (
        @AssessmentDate, @ConsultantName, @ProjectName, @AssessedBy,
        @LegalRegistered, @ValidLicenses, @Comments
    );
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

-- =============================================
-- SP: Insert DSA Record
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertDSA')
    DROP PROCEDURE sp_InsertDSA;
GO

CREATE PROCEDURE sp_InsertDSA
    @AssessmentDate DATETIME,
    @FactoryId INT = NULL,
    @Location NVARCHAR(255) = NULL,
    @AssessedBy NVARCHAR(100) = NULL,
    @BulkDrawings NVARCHAR(10) = NULL,
    @SiteInspection NVARCHAR(10) = NULL,
    @Observations NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO DSA (
        AssessmentDate, FactoryId, Location, AssessedBy,
        BulkDrawings, SiteInspection, Observations
    )
    VALUES (
        @AssessmentDate, @FactoryId, @Location, @AssessedBy,
        @BulkDrawings, @SiteInspection, @Observations
    );
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

-- =============================================
-- SP: Insert Emergency Power Record
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_InsertEmergencyPower')
    DROP PROCEDURE sp_InsertEmergencyPower;
GO

CREATE PROCEDURE sp_InsertEmergencyPower
    @InspectionDate DATETIME,
    @FactoryId INT = NULL,
    @Location NVARCHAR(255) = NULL,
    @InspectedBy NVARCHAR(100) = NULL,
    @SitePlan NVARCHAR(10) = NULL,
    @EgressLayout NVARCHAR(10) = NULL,
    @AdditionalNotes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO EmergencyPower (
        InspectionDate, FactoryId, Location, InspectedBy,
        SitePlan, EgressLayout, AdditionalNotes
    )
    VALUES (
        @InspectionDate, @FactoryId, @Location, @InspectedBy,
        @SitePlan, @EgressLayout, @AdditionalNotes
    );
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

PRINT 'All tables and stored procedures created successfully!';
