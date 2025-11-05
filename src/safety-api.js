/**
 * Safety Officer API Routes
 * Handles all CRUD operations for safety modules
 */

const express = require('express');
const sql = require('mssql');

function setupSafetyRoutes(app, pool) {
  
  // ==================== INCIDENTS ====================
  
  // Get all incidents
  app.get('/api/safety/incidents', async (req, res) => {
    try {
      const result = await pool.request().query(`
        SELECT * FROM SafetyIncidents 
        ORDER BY CreatedDate DESC
      `);
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching incidents:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single incident
  app.get('/api/safety/incidents/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT * FROM SafetyIncidents WHERE Id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, error: 'Incident not found' });
      }
      res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
      console.error('Error fetching incident:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create incident
  app.post('/api/safety/incidents', async (req, res) => {
    try {
      const { 
        incidentDate, incidentType, location, department, description,
        injuryOccurred, propertyDamage, severity, reportedBy,
        investigationStatus, correctiveAction, status 
      } = req.body;

      const result = await pool.request()
        .input('incidentDate', sql.DateTime, incidentDate)
        .input('incidentType', sql.NVarChar, incidentType)
        .input('location', sql.NVarChar, location)
        .input('department', sql.NVarChar, department)
        .input('description', sql.NVarChar, description)
        .input('injuryOccurred', sql.NVarChar, injuryOccurred)
        .input('propertyDamage', sql.NVarChar, propertyDamage)
        .input('severity', sql.NVarChar, severity)
        .input('reportedBy', sql.NVarChar, reportedBy)
        .input('investigationStatus', sql.NVarChar, investigationStatus)
        .input('correctiveAction', sql.NVarChar, correctiveAction)
        .input('status', sql.NVarChar, status || 'Open')
        .query(`
          INSERT INTO SafetyIncidents (
            IncidentDate, IncidentType, Location, Department, Description,
            InjuryOccurred, PropertyDamage, Severity, ReportedBy,
            InvestigationStatus, CorrectiveAction, Status
          ) VALUES (
            @incidentDate, @incidentType, @location, @department, @description,
            @injuryOccurred, @propertyDamage, @severity, @reportedBy,
            @investigationStatus, @correctiveAction, @status
          );
          SELECT SCOPE_IDENTITY() AS Id;
        `);

      res.json({ success: true, id: result.recordset[0].Id, message: 'Incident created successfully' });
    } catch (err) {
      console.error('Error creating incident:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update incident
  app.put('/api/safety/incidents/:id', async (req, res) => {
    try {
      const { 
        incidentDate, incidentType, location, department, description,
        injuryOccurred, propertyDamage, severity, reportedBy,
        investigationStatus, correctiveAction, status 
      } = req.body;

      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('incidentDate', sql.DateTime, incidentDate)
        .input('incidentType', sql.NVarChar, incidentType)
        .input('location', sql.NVarChar, location)
        .input('department', sql.NVarChar, department)
        .input('description', sql.NVarChar, description)
        .input('injuryOccurred', sql.NVarChar, injuryOccurred)
        .input('propertyDamage', sql.NVarChar, propertyDamage)
        .input('severity', sql.NVarChar, severity)
        .input('reportedBy', sql.NVarChar, reportedBy)
        .input('investigationStatus', sql.NVarChar, investigationStatus)
        .input('correctiveAction', sql.NVarChar, correctiveAction)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE SafetyIncidents SET
            IncidentDate = @incidentDate,
            IncidentType = @incidentType,
            Location = @location,
            Department = @department,
            Description = @description,
            InjuryOccurred = @injuryOccurred,
            PropertyDamage = @propertyDamage,
            Severity = @severity,
            ReportedBy = @reportedBy,
            InvestigationStatus = @investigationStatus,
            CorrectiveAction = @correctiveAction,
            Status = @status,
            UpdatedDate = GETDATE()
          WHERE Id = @id
        `);

      res.json({ success: true, message: 'Incident updated successfully' });
    } catch (err) {
      console.error('Error updating incident:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete incident
  app.delete('/api/safety/incidents/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('DELETE FROM SafetyIncidents WHERE Id = @id');
      
      res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (err) {
      console.error('Error deleting incident:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== GRIEVANCES ====================
  
  // Get all grievances
  app.get('/api/safety/grievances', async (req, res) => {
    try {
      const result = await pool.request().query(`
        SELECT * FROM SafetyGrievances 
        ORDER BY CreatedDate DESC
      `);
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching grievances:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create grievance
  app.post('/api/safety/grievances', async (req, res) => {
    try {
      const { 
        grievanceDate, complainantName, complainantRole, grievanceType,
        category, description, priority, assignedTo, resolutionDetails, status 
      } = req.body;

      const result = await pool.request()
        .input('grievanceDate', sql.DateTime, grievanceDate)
        .input('complainantName', sql.NVarChar, complainantName)
        .input('complainantRole', sql.NVarChar, complainantRole)
        .input('grievanceType', sql.NVarChar, grievanceType)
        .input('category', sql.NVarChar, category)
        .input('description', sql.NVarChar, description)
        .input('priority', sql.NVarChar, priority)
        .input('assignedTo', sql.NVarChar, assignedTo)
        .input('resolutionDetails', sql.NVarChar, resolutionDetails)
        .input('status', sql.NVarChar, status || 'Pending')
        .query(`
          INSERT INTO SafetyGrievances (
            GrievanceDate, ComplainantName, ComplainantRole, GrievanceType,
            Category, Description, Priority, AssignedTo, ResolutionDetails, Status
          ) VALUES (
            @grievanceDate, @complainantName, @complainantRole, @grievanceType,
            @category, @description, @priority, @assignedTo, @resolutionDetails, @status
          );
          SELECT SCOPE_IDENTITY() AS Id;
        `);

      res.json({ success: true, id: result.recordset[0].Id, message: 'Grievance created successfully' });
    } catch (err) {
      console.error('Error creating grievance:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update grievance
  app.put('/api/safety/grievances/:id', async (req, res) => {
    try {
      const { 
        grievanceDate, complainantName, complainantRole, grievanceType,
        category, description, priority, assignedTo, resolutionDetails, status 
      } = req.body;

      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('grievanceDate', sql.DateTime, grievanceDate)
        .input('complainantName', sql.NVarChar, complainantName)
        .input('complainantRole', sql.NVarChar, complainantRole)
        .input('grievanceType', sql.NVarChar, grievanceType)
        .input('category', sql.NVarChar, category)
        .input('description', sql.NVarChar, description)
        .input('priority', sql.NVarChar, priority)
        .input('assignedTo', sql.NVarChar, assignedTo)
        .input('resolutionDetails', sql.NVarChar, resolutionDetails)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE SafetyGrievances SET
            GrievanceDate = @grievanceDate,
            ComplainantName = @complainantName,
            ComplainantRole = @complainantRole,
            GrievanceType = @grievanceType,
            Category = @category,
            Description = @description,
            Priority = @priority,
            AssignedTo = @assignedTo,
            ResolutionDetails = @resolutionDetails,
            Status = @status,
            UpdatedDate = GETDATE()
          WHERE Id = @id
        `);

      res.json({ success: true, message: 'Grievance updated successfully' });
    } catch (err) {
      console.error('Error updating grievance:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete grievance
  app.delete('/api/safety/grievances/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('DELETE FROM SafetyGrievances WHERE Id = @id');
      
      res.json({ success: true, message: 'Grievance deleted successfully' });
    } catch (err) {
      console.error('Error deleting grievance:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== FIRE SAFETY ====================
  
  // Self-check endpoint for safety pool and tables
  app.get('/api/safety/self-check', async (_req, res) => {
    try {
      const details = { connected: !!(pool && pool.connected) };
      // Try a lightweight query
      try {
        const ping = await pool.request().query('SELECT GETDATE() AS Now');
        details.now = ping.recordset[0].Now;
      } catch (e) {
        details.queryError = e.message;
      }
      // Ensure SafetyFireSafety table exists
      await pool.request().query(`
        IF OBJECT_ID('dbo.SafetyFireSafety','U') IS NULL
        BEGIN
          CREATE TABLE dbo.SafetyFireSafety(
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TenantId INT NOT NULL,
            FormData NVARCHAR(MAX) NOT NULL,
            CreatedBy NVARCHAR(255) NULL,
            CreatedDate DATETIME2 DEFAULT GETDATE(),
            UpdatedDate DATETIME2 NULL
          );
        END`);
      return res.json({ success: true, message: 'Safety API self-check OK', data: details });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get all fire safety records
  app.get('/api/safety/fire', async (req, res) => {
    try {
      // Check if pool is connected
      if (!pool || !pool.connected) {
        return res.status(503).json({ success: false, error: 'Database connection not available' });
      }
      
      // Try to get FormData records first (for checklist forms)
      const formDataResult = await pool.request().query(`
        SELECT * FROM SafetyFireSafety 
        ORDER BY CreatedDate DESC
      `);
      
      if (formDataResult.recordset.length > 0) {
        return res.json({ success: true, data: formDataResult.recordset });
      }
      
      // Fallback to structured records
      const result = await pool.request().query(`
        SELECT * FROM FireSafety 
        ORDER BY CreatedDate DESC
      `);
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching fire safety records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create fire safety record
  app.post('/api/safety/fire', async (req, res) => {
    try {
      // Check if pool is connected
      if (!pool || !pool.connected) {
        console.error('❌ Database pool not connected');
        return res.status(503).json({ success: false, error: 'Database connection not available' });
      }
      
      console.log('📥 Received POST /api/safety/fire');
      console.log('📦 Body:', req.body);
      
      // Normalize form payload
      let data = req.body?.formData ?? null;
      // Accept stringified JSON
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }
      // If someone accidentally passed an Event or empty object, try to rebuild from body
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0) ||
          (typeof data === 'object' && Object.keys(data).length === 1 && data.isTrusted === true)) {
        const fallback = { ...req.body };
        delete fallback.formData; delete fallback.createdBy; delete fallback.tenantId;
        // If fallback has real fields, use it
        if (Object.keys(fallback).length > 0) data = fallback;
      }

      // If we have a generic object (checklist), store it in SafetyFireSafety (UPSERT by TenantId)
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log('💾 Upserting normalized formData to SafetyFireSafety table');
        const result = await pool.request()
          .input('formData', sql.NVarChar, JSON.stringify(data))
          .input('tenantId', sql.Int, req.auth?.tid || 1)
          .input('createdBy', sql.NVarChar, (req.auth?.uid?.toString()) || 'System')
          .query(`
            IF OBJECT_ID('dbo.SafetyFireSafety','U') IS NULL
            BEGIN
              CREATE TABLE dbo.SafetyFireSafety(
                Id INT IDENTITY(1,1) PRIMARY KEY,
                TenantId INT NOT NULL,
                FormData NVARCHAR(MAX) NOT NULL,
                CreatedBy NVARCHAR(255) NULL,
                CreatedDate DATETIME2 DEFAULT GETDATE(),
                UpdatedDate DATETIME2 NULL
              );
            END;
            IF EXISTS (SELECT 1 FROM SafetyFireSafety WHERE TenantId = @tenantId)
            BEGIN
              UPDATE SafetyFireSafety SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
              SELECT Id FROM SafetyFireSafety WHERE TenantId = @tenantId;
            END
            ELSE
            BEGIN
              INSERT INTO SafetyFireSafety (TenantId, FormData, CreatedBy)
              VALUES (@tenantId, @formData, @createdBy);
              SELECT SCOPE_IDENTITY() AS Id;
            END;
          `);
        console.log('✅ Data saved with ID:', result.recordset[0].Id);
        return res.json({ success: true, id: result.recordset[0].Id, message: 'Fire safety checklist saved successfully' });
      }
      
      // Handle structured fire safety record
      const { 
        inspectionDate, location, equipmentType, equipmentId, fireExtinguishersCount,
        fireExtinguishersWorking, smokeDetectorsCount, smokeDetectorsWorking,
        fireAlarmsWorking, emergencyExitsClear, fireDrillConducted, lastDrillDate,
        deficiencies, correctiveActions, inspectedBy, status 
      } = req.body;

      const result = await pool.request()
        .input('inspectionDate', sql.DateTime, inspectionDate)
        .input('location', sql.NVarChar, location)
        .input('equipmentType', sql.NVarChar, equipmentType)
        .input('equipmentId', sql.NVarChar, equipmentId)
        .input('fireExtinguishersCount', sql.Int, fireExtinguishersCount)
        .input('fireExtinguishersWorking', sql.NVarChar, fireExtinguishersWorking)
        .input('smokeDetectorsCount', sql.Int, smokeDetectorsCount)
        .input('smokeDetectorsWorking', sql.NVarChar, smokeDetectorsWorking)
        .input('fireAlarmsWorking', sql.NVarChar, fireAlarmsWorking)
        .input('emergencyExitsClear', sql.NVarChar, emergencyExitsClear)
        .input('fireDrillConducted', sql.NVarChar, fireDrillConducted)
        .input('lastDrillDate', sql.DateTime, lastDrillDate)
        .input('deficiencies', sql.NVarChar, deficiencies)
        .input('correctiveActions', sql.NVarChar, correctiveActions)
        .input('inspectedBy', sql.NVarChar, inspectedBy)
        .input('status', sql.NVarChar, status || 'Compliant')
        .query(`
          INSERT INTO FireSafety (
            InspectionDate, Location, EquipmentType, EquipmentId, FireExtinguishersCount,
            FireExtinguishersWorking, SmokeDetectorsCount, SmokeDetectorsWorking,
            FireAlarmsWorking, EmergencyExitsClear, FireDrillConducted, LastDrillDate,
            Deficiencies, CorrectiveActions, InspectedBy, Status
          ) VALUES (
            @inspectionDate, @location, @equipmentType, @equipmentId, @fireExtinguishersCount,
            @fireExtinguishersWorking, @smokeDetectorsCount, @smokeDetectorsWorking,
            @fireAlarmsWorking, @emergencyExitsClear, @fireDrillConducted, @lastDrillDate,
            @deficiencies, @correctiveActions, @inspectedBy, @status
          );
          SELECT SCOPE_IDENTITY() AS Id;
        `);

      res.json({ success: true, id: result.recordset[0].Id, message: 'Fire safety record created successfully' });
    } catch (err) {
      console.error('Error creating fire safety record:', err);
      res.json({ success: false, error: err.message });
    }
  });

  // Update fire safety record
  app.put('/api/safety/fire/:id', async (req, res) => {
    try {
      const { 
        inspectionDate, location, equipmentType, equipmentId, fireExtinguishersCount,
        fireExtinguishersWorking, smokeDetectorsCount, smokeDetectorsWorking,
        fireAlarmsWorking, emergencyExitsClear, fireDrillConducted, lastDrillDate,
        deficiencies, correctiveActions, inspectedBy, status 
      } = req.body;

      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('inspectionDate', sql.DateTime, inspectionDate)
        .input('location', sql.NVarChar, location)
        .input('equipmentType', sql.NVarChar, equipmentType)
        .input('equipmentId', sql.NVarChar, equipmentId)
        .input('fireExtinguishersCount', sql.Int, fireExtinguishersCount)
        .input('fireExtinguishersWorking', sql.NVarChar, fireExtinguishersWorking)
        .input('smokeDetectorsCount', sql.Int, smokeDetectorsCount)
        .input('smokeDetectorsWorking', sql.NVarChar, smokeDetectorsWorking)
        .input('fireAlarmsWorking', sql.NVarChar, fireAlarmsWorking)
        .input('emergencyExitsClear', sql.NVarChar, emergencyExitsClear)
        .input('fireDrillConducted', sql.NVarChar, fireDrillConducted)
        .input('lastDrillDate', sql.DateTime, lastDrillDate)
        .input('deficiencies', sql.NVarChar, deficiencies)
        .input('correctiveActions', sql.NVarChar, correctiveActions)
        .input('inspectedBy', sql.NVarChar, inspectedBy)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE FireSafety SET
            InspectionDate = @inspectionDate,
            Location = @location,
            EquipmentType = @equipmentType,
            EquipmentId = @equipmentId,
            FireExtinguishersCount = @fireExtinguishersCount,
            FireExtinguishersWorking = @fireExtinguishersWorking,
            SmokeDetectorsCount = @smokeDetectorsCount,
            SmokeDetectorsWorking = @smokeDetectorsWorking,
            FireAlarmsWorking = @fireAlarmsWorking,
            EmergencyExitsClear = @emergencyExitsClear,
            FireDrillConducted = @fireDrillConducted,
            LastDrillDate = @lastDrillDate,
            Deficiencies = @deficiencies,
            CorrectiveActions = @correctiveActions,
            InspectedBy = @inspectedBy,
            Status = @status,
            UpdatedDate = GETDATE()
          WHERE Id = @id
        `);

      res.json({ success: true, message: 'Fire safety record updated successfully' });
    } catch (err) {
      console.error('Error updating fire safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete fire safety record
  app.delete('/api/safety/fire/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('DELETE FROM FireSafety WHERE Id = @id');
      
      res.json({ success: true, message: 'Fire safety record deleted successfully' });
    } catch (err) {
      console.error('Error deleting fire safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== ELECTRICAL SAFETY ====================
  
  app.get('/api/safety/electrical', async (req, res) => {
    try {
      // Prefer single-record JSON table
      const jsonRes = await pool.request().query(`
        IF OBJECT_ID('dbo.SafetyElectrical','U') IS NULL BEGIN
          CREATE TABLE dbo.SafetyElectrical(
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TenantId INT NOT NULL,
            FormData NVARCHAR(MAX) NOT NULL,
            CreatedBy NVARCHAR(255) NULL,
            CreatedDate DATETIME2 DEFAULT GETDATE(),
            UpdatedDate DATETIME2 NULL
          );
        END;
        SELECT TOP 1 * FROM SafetyElectrical ORDER BY CreatedDate DESC;
      `);
      if (jsonRes.recordset && jsonRes.recordset.length > 0) {
        return res.json({ success: true, data: jsonRes.recordset });
      }
      // Fallback to legacy structured rows
      const result = await pool.request().query('SELECT * FROM ElectricalSafety ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching electrical records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/electrical', async (req, res) => {
    try {
      // Normalize to single JSON object
      let data = req.body?.formData ?? null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        const fb = { ...req.body }; delete fb.formData; delete fb.createdBy; delete fb.tenantId;
        if (Object.keys(fb).length > 0) data = fb;
      }
      const result = await pool.request()
        .input('tenantId', sql.Int, req.body.tenantId || 1)
        .input('formData', sql.NVarChar, JSON.stringify(data || {}))
        .input('createdBy', sql.NVarChar, req.body.createdBy || 'System')
        .query(`
          IF OBJECT_ID('dbo.SafetyElectrical','U') IS NULL
          BEGIN
            CREATE TABLE dbo.SafetyElectrical(
              Id INT IDENTITY(1,1) PRIMARY KEY,
              TenantId INT NOT NULL,
              FormData NVARCHAR(MAX) NOT NULL,
              CreatedBy NVARCHAR(255) NULL,
              CreatedDate DATETIME2 DEFAULT GETDATE(),
              UpdatedDate DATETIME2 NULL
            );
          END;
          IF EXISTS (SELECT 1 FROM SafetyElectrical WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyElectrical SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyElectrical WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyElectrical (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Electrical safety saved' });
    } catch (err) {
      console.error('Error saving electrical record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/electrical/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM ElectricalSafety WHERE Id = @id');
      res.json({ success: true, message: 'Electrical safety record deleted' });
    } catch (err) {
      console.error('Error deleting electrical record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== STRUCTURAL SAFETY ====================
  
  app.get('/api/safety/structural', async (req, res) => {
    try {
      const jsonRes = await pool.request().query(`
        IF OBJECT_ID('dbo.SafetyStructural','U') IS NULL BEGIN
          CREATE TABLE dbo.SafetyStructural(
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TenantId INT NOT NULL,
            FormData NVARCHAR(MAX) NOT NULL,
            CreatedBy NVARCHAR(255) NULL,
            CreatedDate DATETIME2 DEFAULT GETDATE(),
            UpdatedDate DATETIME2 NULL
          );
        END;
        SELECT TOP 1 * FROM SafetyStructural ORDER BY CreatedDate DESC;
      `);
      if (jsonRes.recordset && jsonRes.recordset.length > 0) {
        return res.json({ success: true, data: jsonRes.recordset });
      }
      const result = await pool.request().query('SELECT * FROM StructuralSafety ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching structural records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/structural', async (req, res) => {
    try {
      let data = req.body?.formData ?? null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        const fb = { ...req.body }; delete fb.formData; delete fb.createdBy; delete fb.tenantId;
        if (Object.keys(fb).length > 0) data = fb;
      }
      const result = await pool.request()
        .input('tenantId', sql.Int, req.body.tenantId || 1)
        .input('formData', sql.NVarChar, JSON.stringify(data || {}))
        .input('createdBy', sql.NVarChar, req.body.createdBy || 'System')
        .query(`
          IF OBJECT_ID('dbo.SafetyStructural','U') IS NULL
          BEGIN
            CREATE TABLE dbo.SafetyStructural(
              Id INT IDENTITY(1,1) PRIMARY KEY,
              TenantId INT NOT NULL,
              FormData NVARCHAR(MAX) NOT NULL,
              CreatedBy NVARCHAR(255) NULL,
              CreatedDate DATETIME2 DEFAULT GETDATE(),
              UpdatedDate DATETIME2 NULL
            );
          END;
          IF EXISTS (SELECT 1 FROM SafetyStructural WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyStructural SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyStructural WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyStructural (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Structural safety saved' });
    } catch (err) {
      console.error('Error saving structural record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/structural/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM StructuralSafety WHERE Id = @id');
      res.json({ success: true, message: 'Structural safety record deleted' });
    } catch (err) {
      console.error('Error deleting structural record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== HEALTH HAZARDS ====================
  
  app.get('/api/safety/health', async (req, res) => {
    try {
      const jsonRes = await pool.request().query(`
        IF OBJECT_ID('dbo.SafetyHealthHazards','U') IS NULL BEGIN
          CREATE TABLE dbo.SafetyHealthHazards(
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TenantId INT NOT NULL,
            FormData NVARCHAR(MAX) NOT NULL,
            CreatedBy NVARCHAR(255) NULL,
            CreatedDate DATETIME2 DEFAULT GETDATE(),
            UpdatedDate DATETIME2 NULL
          );
        END;
        SELECT TOP 1 * FROM SafetyHealthHazards ORDER BY CreatedDate DESC;
      `);
      if (jsonRes.recordset && jsonRes.recordset.length > 0) {
        return res.json({ success: true, data: jsonRes.recordset });
      }
      const result = await pool.request().query('SELECT * FROM HealthHazards ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching health hazards:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/health', async (req, res) => {
    try {
      let data = req.body?.formData ?? null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        const fb = { ...req.body }; delete fb.formData; delete fb.createdBy; delete fb.tenantId;
        if (Object.keys(fb).length > 0) data = fb;
      }
      const result = await pool.request()
        .input('tenantId', sql.Int, req.body.tenantId || 1)
        .input('formData', sql.NVarChar, JSON.stringify(data || {}))
        .input('createdBy', sql.NVarChar, req.body.createdBy || 'System')
        .query(`
          IF OBJECT_ID('dbo.SafetyHealthHazards','U') IS NULL
          BEGIN
            CREATE TABLE dbo.SafetyHealthHazards(
              Id INT IDENTITY(1,1) PRIMARY KEY,
              TenantId INT NOT NULL,
              FormData NVARCHAR(MAX) NOT NULL,
              CreatedBy NVARCHAR(255) NULL,
              CreatedDate DATETIME2 DEFAULT GETDATE(),
              UpdatedDate DATETIME2 NULL
            );
          END;
          IF EXISTS (SELECT 1 FROM SafetyHealthHazards WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyHealthHazards SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyHealthHazards WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyHealthHazards (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Health hazards saved' });
    } catch (err) {
      console.error('Error saving health hazards:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/health/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM HealthHazards WHERE Id = @id');
      res.json({ success: true, message: 'Health hazard record deleted' });
    } catch (err) {
      console.error('Error deleting health hazard record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== USC-SAFE ====================
  
  app.get('/api/safety/usc-safe', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyUSCSafe ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching USC-Safe records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/usc-safe', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyUSCSafe WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyUSCSafe SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyUSCSafe WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyUSCSafe (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'USC-Safe record saved' });
    } catch (err) {
      console.error('Error saving USC-Safe record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/usc-safe/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyUSCSafe SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'USC-Safe record updated' });
    } catch (err) {
      console.error('Error updating USC-Safe record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/usc-safe/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyUSCSafe WHERE Id = @id');
      res.json({ success: true, message: 'USC-Safe record deleted' });
    } catch (err) {
      console.error('Error deleting USC-Safe record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== GAS SAFETY ====================
  
  app.get('/api/safety/gas', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyGasSafety ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching gas safety records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/gas', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyGasSafety WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyGasSafety SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyGasSafety WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyGasSafety (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Gas safety record saved' });
    } catch (err) {
      console.error('Error saving gas safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/gas/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyGasSafety SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'Gas safety record updated' });
    } catch (err) {
      console.error('Error updating gas safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/gas/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyGasSafety WHERE Id = @id');
      res.json({ success: true, message: 'Gas safety record deleted' });
    } catch (err) {
      console.error('Error deleting gas safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== BOILER SAFETY ====================
  
  app.get('/api/safety/boiler', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyBoilerSafety ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching boiler safety records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/boiler', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyBoilerSafety WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyBoilerSafety SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyBoilerSafety WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyBoilerSafety (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Boiler safety record saved' });
    } catch (err) {
      console.error('Error saving boiler safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/boiler/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyBoilerSafety SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'Boiler safety record updated' });
    } catch (err) {
      console.error('Error updating boiler safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/boiler/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyBoilerSafety WHERE Id = @id');
      res.json({ success: true, message: 'Boiler safety record deleted' });
    } catch (err) {
      console.error('Error deleting boiler safety record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== CONSULTANT ====================
  
  app.get('/api/safety/consultant', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyConsultant ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching consultant records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/consultant', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyConsultant WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyConsultant SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyConsultant WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyConsultant (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Consultant record saved' });
    } catch (err) {
      console.error('Error saving consultant record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/consultant/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyConsultant SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'Consultant record updated' });
    } catch (err) {
      console.error('Error updating consultant record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/consultant/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyConsultant WHERE Id = @id');
      res.json({ success: true, message: 'Consultant record deleted' });
    } catch (err) {
      console.error('Error deleting consultant record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== DSA ====================
  
  app.get('/api/safety/dsa', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyDSA ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching DSA records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/dsa', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyDSA WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyDSA SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyDSA WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyDSA (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'DSA record saved' });
    } catch (err) {
      console.error('Error saving DSA record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/dsa/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyDSA SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'DSA record updated' });
    } catch (err) {
      console.error('Error updating DSA record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/dsa/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyDSA WHERE Id = @id');
      res.json({ success: true, message: 'DSA record deleted' });
    } catch (err) {
      console.error('Error deleting DSA record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== EMERGENCY POWER ====================
  
  app.get('/api/safety/emergency-power', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyEmergencyPower ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching emergency power records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/emergency-power', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyEmergencyPower WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyEmergencyPower SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyEmergencyPower WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyEmergencyPower (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Emergency power record saved' });
    } catch (err) {
      console.error('Error saving emergency power record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/emergency-power/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyEmergencyPower SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'Emergency power record updated' });
    } catch (err) {
      console.error('Error updating emergency power record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/emergency-power/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyEmergencyPower WHERE Id = @id');
      res.json({ success: true, message: 'Emergency power record deleted' });
    } catch (err) {
      console.error('Error deleting emergency power record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== SAFETY TRAINING ====================
  
  app.get('/api/safety/training', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetySafetyTraining ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching training records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/training', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetySafetyTraining WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetySafetyTraining SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetySafetyTraining WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetySafetyTraining (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'Training record saved' });
    } catch (err) {
      console.error('Error saving training record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/training/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetySafetyTraining SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'Training record updated' });
    } catch (err) {
      console.error('Error updating training record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/training/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetySafetyTraining WHERE Id = @id');
      res.json({ success: true, message: 'Training record deleted' });
    } catch (err) {
      console.error('Error deleting training record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== New multi-session Training Module (sessions + attendees) =====
  async function ensureTrainingTables(){
    await pool.request().query(`
      IF OBJECT_ID('dbo.SafetyTrainingSession','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyTrainingSession(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          Name NVARCHAR(255) NOT NULL,
          Description NVARCHAR(MAX) NULL,
          RelatedTo NVARCHAR(255) NULL,
          TrainingDate DATETIME2 NULL,
          ConductedBy NVARCHAR(255) NULL,
          CreatedBy NVARCHAR(255) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          UpdatedDate DATETIME2 NULL
        );
      END;
      IF OBJECT_ID('dbo.SafetyTrainingAttendee','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyTrainingAttendee(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          SessionId INT NOT NULL,
          EmployeeId INT NULL,
          Name NVARCHAR(255) NULL,
          Email NVARCHAR(255) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE()
        );
      END;
    `);
  }

  app.get('/api/safety/training-sessions', async (req, res) => {
    try{
      await ensureTrainingTables();
      const { tenantId, q, fromDate, toDate } = req.query;
      let where = 'WHERE 1=1';
      const rq = pool.request();
      if(tenantId){ where += ' AND TenantId=@TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if(q){ where += ' AND (Name LIKE @Q OR RelatedTo LIKE @Q)'; rq.input('Q', sql.NVarChar, `%${q}%`); }
      if(fromDate){ where += ' AND TrainingDate >= @Fromd'; rq.input('Fromd', sql.DateTime2, fromDate); }
      if(toDate){ where += ' AND TrainingDate <= @Tod'; rq.input('Tod', sql.DateTime2, toDate); }
      const r = await rq.query(`SELECT * FROM SafetyTrainingSession ${where} ORDER BY TrainingDate DESC, CreatedDate DESC`);
      return res.json({ success: true, data: r.recordset });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.post('/api/safety/training-sessions', async (req, res) => {
    try{
      await ensureTrainingTables();
      const { tenantId=1, name, description, relatedTo, trainingDate, conductedBy, createdBy='System', attendees=[] } = req.body;
      if(!name) return res.status(400).json({ success:false, error:'name required' });
      const r = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('Name', sql.NVarChar, name)
        .input('Description', sql.NVarChar, description||null)
        .input('RelatedTo', sql.NVarChar, relatedTo||null)
        .input('TrainingDate', sql.DateTime2, trainingDate||null)
        .input('ConductedBy', sql.NVarChar, conductedBy||null)
        .input('CreatedBy', sql.NVarChar, createdBy)
        .query(`INSERT INTO SafetyTrainingSession(TenantId,Name,Description,RelatedTo,TrainingDate,ConductedBy,CreatedBy)
                 VALUES(@TenantId,@Name,@Description,@RelatedTo,@TrainingDate,@ConductedBy,@CreatedBy); SELECT SCOPE_IDENTITY() AS Id;`);
      const sessionId = r.recordset[0].Id;
      for(const a of attendees){
        await pool.request()
          .input('SessionId', sql.Int, sessionId)
          .input('EmployeeId', sql.Int, a.employeeId || null)
          .input('Name', sql.NVarChar, a.name || null)
          .input('Email', sql.NVarChar, a.email || null)
          .query('INSERT INTO SafetyTrainingAttendee(SessionId,EmployeeId,Name,Email) VALUES(@SessionId,@EmployeeId,@Name,@Email)');
      }
      return res.json({ success:true, id: sessionId, message:'Training created' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.get('/api/safety/training-sessions/:id', async (req, res) => {
    try{
      await ensureTrainingTables();
      const id = parseInt(req.params.id);
      const s = await pool.request().input('Id', sql.Int, id).query('SELECT * FROM SafetyTrainingSession WHERE Id=@Id');
      if(s.recordset.length===0) return res.status(404).json({ success:false, error:'Not found' });
      const a = await pool.request().input('SessionId', sql.Int, id).query('SELECT * FROM SafetyTrainingAttendee WHERE SessionId=@SessionId');
      return res.json({ success:true, data: { session: s.recordset[0], attendees: a.recordset } });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.put('/api/safety/training-sessions/:id', async (req, res) => {
    try{
      await ensureTrainingTables();
      const id = parseInt(req.params.id);
      const { name, description, relatedTo, trainingDate, conductedBy } = req.body;
      await pool.request()
        .input('Id', sql.Int, id)
        .input('Name', sql.NVarChar, name||null)
        .input('Description', sql.NVarChar, description||null)
        .input('RelatedTo', sql.NVarChar, relatedTo||null)
        .input('TrainingDate', sql.DateTime2, trainingDate||null)
        .input('ConductedBy', sql.NVarChar, conductedBy||null)
        .query(`UPDATE SafetyTrainingSession SET 
                  Name=COALESCE(@Name,Name), Description=COALESCE(@Description,Description), RelatedTo=COALESCE(@RelatedTo,RelatedTo),
                  TrainingDate=COALESCE(@TrainingDate,TrainingDate), ConductedBy=COALESCE(@ConductedBy,ConductedBy), UpdatedDate=GETDATE()
                WHERE Id=@Id`);
      return res.json({ success:true, message:'Updated' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.delete('/api/safety/training-sessions/:id', async (req, res) => {
    try{
      await ensureTrainingTables();
      const id = parseInt(req.params.id);
      await pool.request().input('Id', sql.Int, id).query('DELETE FROM SafetyTrainingAttendee WHERE SessionId=@Id; DELETE FROM SafetyTrainingSession WHERE Id=@Id;');
      return res.json({ success:true, message:'Deleted' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.post('/api/safety/training-sessions/:id/attendees', async (req, res) => {
    try{
      await ensureTrainingTables();
      const id = parseInt(req.params.id);
      const attendees = Array.isArray(req.body.attendees)? req.body.attendees : [];
      await pool.request().input('Id', sql.Int, id).query('DELETE FROM SafetyTrainingAttendee WHERE SessionId=@Id');
      for(const a of attendees){
        await pool.request()
          .input('SessionId', sql.Int, id)
          .input('EmployeeId', sql.Int, a.employeeId || null)
          .input('Name', sql.NVarChar, a.name || null)
          .input('Email', sql.NVarChar, a.email || null)
          .query('INSERT INTO SafetyTrainingAttendee(SessionId,EmployeeId,Name,Email) VALUES(@SessionId,@EmployeeId,@Name,@Email)');
      }
      return res.json({ success:true, message:'Attendees saved' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // ==================== UNGP ====================
  
  app.get('/api/safety/ungp', async (req, res) => {
    try {
      const result = await pool.request().query('SELECT * FROM SafetyUNGP ORDER BY CreatedDate DESC');
      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error fetching UNGP records:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/safety/ungp', async (req, res) => {
    try {
      const tenantId = req.body.tenantId || 1;
      const formData = JSON.stringify(req.body.formData);
      const createdBy = req.body.createdBy || 'System';
      
      const result = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('formData', sql.NVarChar, formData)
        .input('createdBy', sql.NVarChar, createdBy)
        .query(`
          IF EXISTS (SELECT 1 FROM SafetyUNGP WHERE TenantId = @tenantId)
          BEGIN
            UPDATE SafetyUNGP SET FormData = @formData, UpdatedDate = GETDATE() WHERE TenantId = @tenantId;
            SELECT Id FROM SafetyUNGP WHERE TenantId = @tenantId;
          END
          ELSE
          BEGIN
            INSERT INTO SafetyUNGP (TenantId, FormData, CreatedBy)
            VALUES (@tenantId, @formData, @createdBy);
            SELECT SCOPE_IDENTITY() AS Id;
          END
        `);
      res.json({ success: true, id: result.recordset[0].Id, message: 'UNGP record saved' });
    } catch (err) {
      console.error('Error saving UNGP record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/safety/ungp/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .input('formData', sql.NVarChar, JSON.stringify(req.body.formData))
        .query('UPDATE SafetyUNGP SET FormData = @formData, UpdatedDate = GETDATE() WHERE Id = @id');
      res.json({ success: true, message: 'UNGP record updated' });
    } catch (err) {
      console.error('Error updating UNGP record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/safety/ungp/:id', async (req, res) => {
    try {
      await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SafetyUNGP WHERE Id = @id');
      res.json({ success: true, message: 'UNGP record deleted' });
    } catch (err) {
      console.error('Error deleting UNGP record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  
  // ==================== SAFETY AUDITS (Planning • Audit • Corrective • Reaudit • Closed) ====================
  
  async function ensureAuditTables() {
    await pool.request().query(`
      IF OBJECT_ID('dbo.SafetyAuditPlan','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAuditPlan(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          AuditName NVARCHAR(255) NOT NULL,
          AuditType NVARCHAR(100) NOT NULL,
          AuditCompany NVARCHAR(255) NULL,
          AuditDate DATETIME2 NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT('Planned'),
          CreatedBy NVARCHAR(255) NULL,
          CreatedDate DATETIME2 NOT NULL DEFAULT(GETDATE()),
          UpdatedDate DATETIME2 NULL
        );
      END;
      IF OBJECT_ID('dbo.SafetyAuditItem','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAuditItem(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          AuditId INT NOT NULL,
          Head NVARCHAR(255) NOT NULL,
          Value NVARCHAR(255) NULL,
          NoIssue BIT NOT NULL DEFAULT(1),
          IssueDetails NVARCHAR(MAX) NULL,
          Attachments NVARCHAR(MAX) NULL,
          SuggestedAction NVARCHAR(MAX) NULL,
          InformedTo NVARCHAR(255) NULL,
          CreatedDate DATETIME2 NOT NULL DEFAULT(GETDATE()),
          UpdatedDate DATETIME2 NULL
        );
      END;
      IF OBJECT_ID('dbo.SafetyAuditCorrectiveAction','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAuditCorrectiveAction(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          AuditItemId INT NOT NULL,
          CorrectiveActionTaken NVARCHAR(MAX) NULL,
          Attachments NVARCHAR(MAX) NULL,
          CorrectiveActionBy NVARCHAR(255) NULL,
          CorrectiveActionOn DATETIME2 NULL,
          CreatedDate DATETIME2 NOT NULL DEFAULT(GETDATE())
        );
      END;
      IF OBJECT_ID('dbo.SafetyAuditReaudit','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAuditReaudit(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          AuditId INT NOT NULL,
          Notes NVARCHAR(MAX) NULL,
          Attachments NVARCHAR(MAX) NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT('Closed'),
          CreatedBy NVARCHAR(255) NULL,
          CreatedDate DATETIME2 NOT NULL DEFAULT(GETDATE())
        );
      END;
    `);
  }

  // Create/plan an audit (Factory Management / Safety Officer)
  app.post('/api/safety/audits', async (req, res) => {
    try {
      await ensureAuditTables();
      const { tenantId = 1, auditName, auditType, auditCompany, auditDate, createdBy = 'System' } = req.body;
      if (!auditName || !auditType) return res.status(400).json({ success: false, error: 'auditName and auditType are required' });
      const result = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('AuditName', sql.NVarChar, auditName)
        .input('AuditType', sql.NVarChar, auditType)
        .input('AuditCompany', sql.NVarChar, auditCompany || null)
        .input('AuditDate', sql.DateTime2, auditDate || null)
        .input('CreatedBy', sql.NVarChar, createdBy)
        .query(`
          INSERT INTO SafetyAuditPlan (TenantId, AuditName, AuditType, AuditCompany, AuditDate, CreatedBy)
          VALUES (@TenantId, @AuditName, @AuditType, @AuditCompany, @AuditDate, @CreatedBy);
          SELECT SCOPE_IDENTITY() AS Id;
        `);
      return res.json({ success: true, id: result.recordset[0].Id, message: 'Audit planned successfully' });
    } catch (err) {
      console.error('Error planning audit:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Search/list audits
  app.get('/api/safety/audits', async (req, res) => {
    try {
      await ensureAuditTables();
      const { q, status, tenantId, company } = req.query;
      let where = 'WHERE 1=1';
      if (tenantId) where += ' AND TenantId = @TenantId';
      if (status) where += ' AND Status = @Status';
      if (company) where += ' AND (AuditCompany = @Company)';
      if (q) where += ' AND (AuditName LIKE @Q)';
      const request = pool.request();
      if (tenantId) request.input('TenantId', sql.Int, parseInt(tenantId));
      if (status) request.input('Status', sql.NVarChar, status);
      if (company) request.input('Company', sql.NVarChar, company);
      if (q) request.input('Q', sql.NVarChar, `%${q}%`);
      const result = await request.query(`SELECT * FROM SafetyAuditPlan ${where} ORDER BY CreatedDate DESC`);
      return res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error('Error listing audits:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get audit details with items and latest corrective actions
  app.get('/api/safety/audits/:id', async (req, res) => {
    try {
      await ensureAuditTables();
      const id = parseInt(req.params.id);
      const plan = await pool.request().input('Id', sql.Int, id).query('SELECT * FROM SafetyAuditPlan WHERE Id = @Id');
      if (plan.recordset.length === 0) return res.status(404).json({ success: false, error: 'Audit not found' });
      const items = await pool.request().input('AuditId', sql.Int, id).query('SELECT * FROM SafetyAuditItem WHERE AuditId = @AuditId ORDER BY Id ASC');
      const corrective = await pool.request().input('AuditId', sql.Int, id).query(`
        SELECT c.* FROM SafetyAuditCorrectiveAction c
        INNER JOIN SafetyAuditItem i ON i.Id = c.AuditItemId
        WHERE i.AuditId = @AuditId
        ORDER BY c.CreatedDate DESC
      `);
      const reaudit = await pool.request().input('AuditId', sql.Int, id).query('SELECT TOP 1 * FROM SafetyAuditReaudit WHERE AuditId = @AuditId ORDER BY CreatedDate DESC');
      return res.json({ success: true, data: { plan: plan.recordset[0], items: items.recordset, corrective: corrective.recordset, reaudit: reaudit.recordset[0] || null } });
    } catch (err) {
      console.error('Error fetching audit:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auditor saves audit items (standards checklist)
  app.post('/api/safety/audits/:id/items', async (req, res) => {
    try {
      await ensureAuditTables();
      const id = parseInt(req.params.id);
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (items.length === 0) return res.status(400).json({ success: false, error: 'No items provided' });
      const request = pool.request();
      request.input('AuditId', sql.Int, id);
      // Insert items in a single batch
      for (const it of items) {
        await pool.request()
          .input('AuditId', sql.Int, id)
          .input('Head', sql.NVarChar, it.Head || '')
          .input('Value', sql.NVarChar, it.Value || null)
          .input('NoIssue', sql.Bit, it.NoIssue === false ? 0 : 1)
          .input('IssueDetails', sql.NVarChar, it.IssueDetails || null)
          .input('Attachments', sql.NVarChar, it.Attachments || null)
          .input('SuggestedAction', sql.NVarChar, it.SuggestedAction || null)
          .input('InformedTo', sql.NVarChar, it.InformedTo || null)
          .query(`
            INSERT INTO SafetyAuditItem (AuditId, Head, Value, NoIssue, IssueDetails, Attachments, SuggestedAction, InformedTo)
            VALUES (@AuditId, @Head, @Value, @NoIssue, @IssueDetails, @Attachments, @SuggestedAction, @InformedTo);
          `);
      }
      // Determine status
      const anyIssues = items.some(i => i.NoIssue === false || (i.IssueDetails && i.IssueDetails.trim() !== ''));
      await pool.request()
        .input('Id', sql.Int, id)
        .input('Status', sql.NVarChar, anyIssues ? 'OpenIssues' : 'Closed')
        .query('UPDATE SafetyAuditPlan SET Status = @Status, UpdatedDate = GETDATE() WHERE Id = @Id');
      return res.json({ success: true, message: 'Audit items saved', status: anyIssues ? 'OpenIssues' : 'Closed' });
    } catch (err) {
      console.error('Error saving audit items:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Safety officer submits corrective action for an audit item
  app.post('/api/safety/audits/:auditId/items/:itemId/corrective-actions', async (req, res) => {
    try {
      await ensureAuditTables();
      const { auditId, itemId } = req.params;
      const { correctiveActionTaken, attachments, correctiveActionBy, correctiveActionOn } = req.body;
      const result = await pool.request()
        .input('AuditItemId', sql.Int, parseInt(itemId))
        .input('CorrectiveActionTaken', sql.NVarChar, correctiveActionTaken || null)
        .input('Attachments', sql.NVarChar, attachments || null)
        .input('CorrectiveActionBy', sql.NVarChar, correctiveActionBy || null)
        .input('CorrectiveActionOn', sql.DateTime2, correctiveActionOn || null)
        .query(`
          INSERT INTO SafetyAuditCorrectiveAction (AuditItemId, CorrectiveActionTaken, Attachments, CorrectiveActionBy, CorrectiveActionOn)
          VALUES (@AuditItemId, @CorrectiveActionTaken, @Attachments, @CorrectiveActionBy, @CorrectiveActionOn);
          SELECT SCOPE_IDENTITY() AS Id;
        `);
      // Move audit to CorrectiveSubmitted
      await pool.request()
        .input('Id', sql.Int, parseInt(auditId))
        .query("UPDATE SafetyAuditPlan SET Status = 'CorrectiveSubmitted', UpdatedDate = GETDATE() WHERE Id = @Id");
      return res.json({ success: true, id: result.recordset[0].Id, message: 'Corrective action saved' });
    } catch (err) {
      console.error('Error saving corrective action:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auditor updates audit status and optionally logs reaudit
  app.put('/api/safety/audits/:id/status', async (req, res) => {
    try {
      await ensureAuditTables();
      const id = parseInt(req.params.id);
      const { status, notes, attachments, createdBy = 'Auditor' } = req.body;
      if (!status) return res.status(400).json({ success: false, error: 'status is required' });
      await pool.request().input('Id', sql.Int, id).input('Status', sql.NVarChar, status).query('UPDATE SafetyAuditPlan SET Status = @Status, UpdatedDate = GETDATE() WHERE Id = @Id');
      if (notes || attachments || status === 'Closed') {
        await pool.request()
          .input('AuditId', sql.Int, id)
          .input('Notes', sql.NVarChar, notes || null)
          .input('Attachments', sql.NVarChar, attachments || null)
          .input('Status', sql.NVarChar, status)
          .input('CreatedBy', sql.NVarChar, createdBy)
          .query('INSERT INTO SafetyAuditReaudit (AuditId, Notes, Attachments, Status, CreatedBy) VALUES (@AuditId, @Notes, @Attachments, @Status, @CreatedBy)');
      }
      return res.json({ success: true, message: 'Status updated' });
    } catch (err) {
      console.error('Error updating audit status:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== RFQ / QUOTES / PO / INVOICE ====================

  async function ensureRFQTables() {
    await pool.request().query(`
      IF OBJECT_ID('dbo.SafetyUnits','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyUnits(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          Name NVARCHAR(100) NOT NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT UQ_SafetyUnits UNIQUE (TenantId, Name)
        );
      END;
      IF OBJECT_ID('dbo.SafetyRFQ','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyRFQ(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          AuditId INT NULL,
          AuditItemId INT NULL,
          ItemName NVARCHAR(255) NOT NULL,
          Detail NVARCHAR(MAX) NULL,
          Qty DECIMAL(18,2) NULL,
          Unit NVARCHAR(50) NULL,
          NeededBy DATETIME2 NULL,
          ShippingTerms NVARCHAR(MAX) NULL,
          PaymentTerms NVARCHAR(MAX) NULL,
          OtherTerms NVARCHAR(MAX) NULL,
          Recipients NVARCHAR(MAX) NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT('Open'),
          CreatedBy NVARCHAR(255) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          UpdatedDate DATETIME2 NULL
        );
      END;
      IF OBJECT_ID('dbo.SafetyRFQQuote','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyRFQQuote(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          RFQId INT NOT NULL,
          SupplierName NVARCHAR(255) NULL,
          SupplierEmail NVARCHAR(255) NULL,
          Price DECIMAL(18,2) NULL,
          ShippingCost DECIMAL(18,2) NULL,
          Tax DECIMAL(18,2) NULL,
          Discount DECIMAL(18,2) NULL,
          Total DECIMAL(18,2) NULL,
          ArrivalDate DATETIME2 NULL,
          ShippingTerms NVARCHAR(MAX) NULL,
          PaymentTerms NVARCHAR(MAX) NULL,
          OtherTerms NVARCHAR(MAX) NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT('Submitted'),
          Approved BIT NOT NULL DEFAULT(0),
          ApprovedDate DATETIME2 NULL,
          PONumber NVARCHAR(100) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          UpdatedDate DATETIME2 NULL
        );
      END;
      IF OBJECT_ID('dbo.SafetyRFQInvoice','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyRFQInvoice(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          QuoteId INT NOT NULL,
          InvoiceNumber NVARCHAR(100) NOT NULL,
          Subtotal DECIMAL(18,2) NULL,
          Tax DECIMAL(18,2) NULL,
          Total DECIMAL(18,2) NULL,
          AttachmentUrl NVARCHAR(MAX) NULL,
          Status NVARCHAR(50) NOT NULL DEFAULT('Invoiced'),
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          UpdatedDate DATETIME2 NULL
        );
      END;
    `);
  }

  // Units
  app.get('/api/safety/units', async (req, res) => {
    try {
      await ensureRFQTables();
      const tenantId = parseInt(req.query.tenantId) || 1;
      const result = await pool.request().input('TenantId', sql.Int, tenantId)
        .query('SELECT * FROM SafetyUnits WHERE TenantId = @TenantId ORDER BY Name');
      return res.json({ success: true, data: result.recordset });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post('/api/safety/units', async (req, res) => {
    try {
      await ensureRFQTables();
      const { tenantId = 1, name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('Name', sql.NVarChar, name)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM SafetyUnits WHERE TenantId = @TenantId AND Name = @Name)
          BEGIN
            INSERT INTO SafetyUnits (TenantId, Name) VALUES (@TenantId, @Name);
            SELECT SCOPE_IDENTITY() AS Id;
          END
          ELSE
          BEGIN
            SELECT Id FROM SafetyUnits WHERE TenantId = @TenantId AND Name = @Name;
          END
        `);
      return res.json({ success: true, id: result.recordset[0].Id });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete('/api/safety/units/:id', async (req, res) => {
    try {
      await ensureRFQTables();
      await pool.request().input('Id', sql.Int, parseInt(req.params.id)).query('DELETE FROM SafetyUnits WHERE Id = @Id');
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // RFQs
  app.post('/api/safety/rfq', async (req, res) => {
    try {
      await ensureRFQTables();
      const {
        tenantId = 1, auditId, auditItemId,
        itemName, detail, qty, unit, neededBy,
        shippingTerms, paymentTerms, otherTerms, recipients,
        createdBy = 'SafetyOfficer'
      } = req.body;
      if (!itemName) return res.status(400).json({ success: false, error: 'itemName is required' });
      const result = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('AuditId', sql.Int, auditId || null)
        .input('AuditItemId', sql.Int, auditItemId || null)
        .input('ItemName', sql.NVarChar, itemName)
        .input('Detail', sql.NVarChar, detail || null)
        .input('Qty', sql.Decimal(18,2), qty || null)
        .input('Unit', sql.NVarChar, unit || null)
        .input('NeededBy', sql.DateTime2, neededBy || null)
        .input('ShippingTerms', sql.NVarChar, shippingTerms || null)
        .input('PaymentTerms', sql.NVarChar, paymentTerms || null)
        .input('OtherTerms', sql.NVarChar, otherTerms || null)
        .input('Recipients', sql.NVarChar, recipients || null)
        .input('CreatedBy', sql.NVarChar, createdBy)
        .query(`
          INSERT INTO SafetyRFQ (TenantId, AuditId, AuditItemId, ItemName, Detail, Qty, Unit, NeededBy, ShippingTerms, PaymentTerms, OtherTerms, Recipients, CreatedBy)
          VALUES (@TenantId, @AuditId, @AuditItemId, @ItemName, @Detail, @Qty, @Unit, @NeededBy, @ShippingTerms, @PaymentTerms, @OtherTerms, @Recipients, @CreatedBy);
          SELECT SCOPE_IDENTITY() AS Id;
        `);
      return res.json({ success: true, id: result.recordset[0].Id, message: 'RFQ created' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put('/api/safety/rfq/:id', async (req, res) => {
    try {
      await ensureRFQTables();
      const id = parseInt(req.params.id);
      const {
        itemName, detail, qty, unit, neededBy,
        shippingTerms, paymentTerms, otherTerms, recipients, status
      } = req.body;
      await pool.request()
        .input('Id', sql.Int, id)
        .input('ItemName', sql.NVarChar, itemName || null)
        .input('Detail', sql.NVarChar, detail || null)
        .input('Qty', sql.Decimal(18,2), qty || null)
        .input('Unit', sql.NVarChar, unit || null)
        .input('NeededBy', sql.DateTime2, neededBy || null)
        .input('ShippingTerms', sql.NVarChar, shippingTerms || null)
        .input('PaymentTerms', sql.NVarChar, paymentTerms || null)
        .input('OtherTerms', sql.NVarChar, otherTerms || null)
        .input('Recipients', sql.NVarChar, recipients || null)
        .input('Status', sql.NVarChar, status || null)
        .query(`
          UPDATE SafetyRFQ SET
            ItemName = COALESCE(@ItemName, ItemName),
            Detail = COALESCE(@Detail, Detail),
            Qty = COALESCE(@Qty, Qty),
            Unit = COALESCE(@Unit, Unit),
            NeededBy = COALESCE(@NeededBy, NeededBy),
            ShippingTerms = COALESCE(@ShippingTerms, ShippingTerms),
            PaymentTerms = COALESCE(@PaymentTerms, PaymentTerms),
            OtherTerms = COALESCE(@OtherTerms, OtherTerms),
            Recipients = COALESCE(@Recipients, Recipients),
            Status = COALESCE(@Status, Status),
            UpdatedDate = GETDATE()
          WHERE Id = @Id
        `);
      return res.json({ success: true, message: 'RFQ updated' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete('/api/safety/rfq/:id', async (req, res) => {
    try {
      await ensureRFQTables();
      await pool.request().input('Id', sql.Int, parseInt(req.params.id)).query('DELETE FROM SafetyRFQ WHERE Id = @Id');
      return res.json({ success: true, message: 'RFQ deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/safety/rfq', async (req, res) => {
    try {
      await ensureRFQTables();
      const { tenantId, status } = req.query;
      let where = 'WHERE 1=1';
      const rq = pool.request();
      if (tenantId) { where += ' AND TenantId = @TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if (status) { where += ' AND Status = @Status'; rq.input('Status', sql.NVarChar, status); }
      const result = await rq.query(`SELECT * FROM SafetyRFQ ${where} ORDER BY CreatedDate DESC`);
      return res.json({ success: true, data: result.recordset });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/safety/rfq/by-item/:auditItemId', async (req, res) => {
    try {
      await ensureRFQTables();
      const result = await pool.request().input('AuditItemId', sql.Int, parseInt(req.params.auditItemId))
        .query('SELECT * FROM SafetyRFQ WHERE AuditItemId = @AuditItemId ORDER BY CreatedDate DESC');
      return res.json({ success: true, data: result.recordset });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Quotes
  app.post('/api/safety/rfq/:id/quotes', async (req, res) => {
    try {
      await ensureRFQTables();
      const rfqId = parseInt(req.params.id);
      const { supplierName, supplierEmail, price, shippingCost, tax, discount, total, arrivalDate, shippingTerms, paymentTerms, otherTerms } = req.body;
      const result = await pool.request()
        .input('RFQId', sql.Int, rfqId)
        .input('SupplierName', sql.NVarChar, supplierName || null)
        .input('SupplierEmail', sql.NVarChar, supplierEmail || null)
        .input('Price', sql.Decimal(18,2), price || 0)
        .input('ShippingCost', sql.Decimal(18,2), shippingCost || 0)
        .input('Tax', sql.Decimal(18,2), tax || 0)
        .input('Discount', sql.Decimal(18,2), discount || 0)
        .input('Total', sql.Decimal(18,2), total || 0)
        .input('ArrivalDate', sql.DateTime2, arrivalDate || null)
        .input('ShippingTerms', sql.NVarChar, shippingTerms || null)
        .input('PaymentTerms', sql.NVarChar, paymentTerms || null)
        .input('OtherTerms', sql.NVarChar, otherTerms || null)
        .query(`
          INSERT INTO SafetyRFQQuote (RFQId, SupplierName, SupplierEmail, Price, ShippingCost, Tax, Discount, Total, ArrivalDate, ShippingTerms, PaymentTerms, OtherTerms)
          VALUES (@RFQId, @SupplierName, @SupplierEmail, @Price, @ShippingCost, @Tax, @Discount, @Total, @ArrivalDate, @ShippingTerms, @PaymentTerms, @OtherTerms);
          SELECT SCOPE_IDENTITY() AS Id;
        `);
      return res.json({ success: true, id: result.recordset[0].Id, message: 'Quote submitted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/safety/rfq/:id/quotes', async (req, res) => {
    try {
      await ensureRFQTables();
      const rfqId = parseInt(req.params.id);
      const result = await pool.request().input('RFQId', sql.Int, rfqId)
        .query('SELECT * FROM SafetyRFQQuote WHERE RFQId = @RFQId ORDER BY CreatedDate DESC');
      return res.json({ success: true, data: result.recordset });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put('/api/safety/quotes/:id/approve', async (req, res) => {
    try {
      await ensureRFQTables();
      const id = parseInt(req.params.id);
      const { poNumber } = req.body;
      await pool.request().input('Id', sql.Int, id).input('PONumber', sql.NVarChar, poNumber || null)
        .query(`
          UPDATE SafetyRFQQuote SET Approved = 1, ApprovedDate = GETDATE(), Status = 'Approved', PONumber = @PONumber WHERE Id = @Id;
        `);
      return res.json({ success: true, message: 'Quote approved' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put('/api/safety/quotes/:id/status', async (req, res) => {
    try {
      await ensureRFQTables();
      const id = parseInt(req.params.id);
      const { status } = req.body;
      await pool.request().input('Id', sql.Int, id).input('Status', sql.NVarChar, status || null)
        .query('UPDATE SafetyRFQQuote SET Status = COALESCE(@Status, Status), UpdatedDate = GETDATE() WHERE Id = @Id');
      return res.json({ success: true, message: 'Quote status updated' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Invoice
  app.post('/api/safety/quotes/:id/invoice', async (req, res) => {
    try {
      await ensureRFQTables();
      const id = parseInt(req.params.id);
      const { invoiceNumber, subtotal, tax, total, attachmentUrl } = req.body;
      const result = await pool.request()
        .input('QuoteId', sql.Int, id)
        .input('InvoiceNumber', sql.NVarChar, invoiceNumber)
        .input('Subtotal', sql.Decimal(18,2), subtotal || 0)
        .input('Tax', sql.Decimal(18,2), tax || 0)
        .input('Total', sql.Decimal(18,2), total || 0)
        .input('AttachmentUrl', sql.NVarChar, attachmentUrl || null)
        .query(`
          INSERT INTO SafetyRFQInvoice (QuoteId, InvoiceNumber, Subtotal, Tax, Total, AttachmentUrl)
          VALUES (@QuoteId, @InvoiceNumber, @Subtotal, @Tax, @Total, @AttachmentUrl);
          SELECT SCOPE_IDENTITY() AS Id;
        `);
      return res.json({ success: true, id: result.recordset[0].Id, message: 'Invoice recorded' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/safety/quotes/:id/invoice', async (req, res) => {
    try {
      await ensureRFQTables();
      const id = parseInt(req.params.id);
      const result = await pool.request().input('QuoteId', sql.Int, id)
        .query('SELECT TOP 1 * FROM SafetyRFQInvoice WHERE QuoteId = @QuoteId ORDER BY CreatedDate DESC');
      return res.json({ success: true, data: result.recordset[0] || null });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Quote stats
  app.get('/api/safety/rfq/quote-stats', async (req, res) => {
    try {
      await ensureRFQTables();
      const { tenantId, supplierEmail } = req.query;
      let where = 'WHERE 1=1';
      const rq = pool.request();
      if (tenantId) { where += ' AND rfq.TenantId = @TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if (supplierEmail) { where += ' AND q.SupplierEmail = @SupplierEmail'; rq.input('SupplierEmail', sql.NVarChar, supplierEmail); }
      const result = await rq.query(`
        SELECT 
          COUNT(*) AS Total,
          SUM(CASE WHEN q.Status = 'Submitted' THEN 1 ELSE 0 END) AS Submitted,
          SUM(CASE WHEN q.Status = 'Approved' THEN 1 ELSE 0 END) AS Approved,
          SUM(CASE WHEN q.Status = 'Delivered' THEN 1 ELSE 0 END) AS Delivered
        FROM SafetyRFQQuote q
        INNER JOIN SafetyRFQ rfq ON rfq.Id = q.RFQId
        ${where}
      `);
      return res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== AI PROMPT TEMPLATES (Tenant Scoped) ====================

  async function ensureAIPromptTables(){
    await pool.request().query(`
      IF OBJECT_ID('dbo.SafetyAIPromptTemplates','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAIPromptTemplates(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          Name NVARCHAR(255) NOT NULL,
          Category NVARCHAR(100) NULL,
          Content NVARCHAR(MAX) NOT NULL,
          CreatedBy NVARCHAR(255) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          UpdatedDate DATETIME2 NULL
        );
      END;
    `);
  }

  // List prompts
  app.get('/api/ai/prompts', async (req, res) => {
    try{
      await ensureAIPromptTables();
      const { tenantId, q, category } = req.query;
      let where = 'WHERE 1=1';
      const rq = pool.request();
      if(tenantId){ where += ' AND TenantId=@TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if(category){ where += ' AND Category=@Category'; rq.input('Category', sql.NVarChar, category); }
      if(q){ where += ' AND (Name LIKE @Q OR Content LIKE @Q)'; rq.input('Q', sql.NVarChar, `%${q}%`); }
      const r = await rq.query(`SELECT * FROM SafetyAIPromptTemplates ${where} ORDER BY CreatedDate DESC`);
      return res.json({ success:true, data:r.recordset });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Create prompt
  app.post('/api/ai/prompts', async (req,res)=>{
    try{
      await ensureAIPromptTables();
      const { tenantId=1, name, category=null, content, createdBy='System' } = req.body;
      if(!name || !content) return res.status(400).json({ success:false, error:'name and content required' });
      const r = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('Name', sql.NVarChar, name)
        .input('Category', sql.NVarChar, category)
        .input('Content', sql.NVarChar, content)
        .input('CreatedBy', sql.NVarChar, createdBy)
        .query(`INSERT INTO SafetyAIPromptTemplates(TenantId,Name,Category,Content,CreatedBy)
                 VALUES(@TenantId,@Name,@Category,@Content,@CreatedBy); SELECT SCOPE_IDENTITY() AS Id;`);
      return res.json({ success:true, id:r.recordset[0].Id, message:'Prompt saved' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Get single prompt
  app.get('/api/ai/prompts/:id', async (req,res)=>{
    try{
      await ensureAIPromptTables();
      const r = await pool.request().input('Id', sql.Int, parseInt(req.params.id)).query('SELECT * FROM SafetyAIPromptTemplates WHERE Id=@Id');
      if(r.recordset.length===0) return res.status(404).json({ success:false, error:'Not found' });
      return res.json({ success:true, data:r.recordset[0] });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Update prompt
  app.put('/api/ai/prompts/:id', async (req,res)=>{
    try{
      await ensureAIPromptTables();
      const { name, category, content } = req.body;
      await pool.request()
        .input('Id', sql.Int, parseInt(req.params.id))
        .input('Name', sql.NVarChar, name||null)
        .input('Category', sql.NVarChar, category||null)
        .input('Content', sql.NVarChar, content||null)
        .query(`UPDATE SafetyAIPromptTemplates SET 
                  Name=COALESCE(@Name,Name), Category=COALESCE(@Category,Category), Content=COALESCE(@Content,Content), UpdatedDate=GETDATE()
                WHERE Id=@Id`);
      return res.json({ success:true, message:'Updated' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Delete prompt
  app.delete('/api/ai/prompts/:id', async (req,res)=>{
    try{
      await ensureAIPromptTables();
      await pool.request().input('Id', sql.Int, parseInt(req.params.id)).query('DELETE FROM SafetyAIPromptTemplates WHERE Id=@Id');
      return res.json({ success:true, message:'Deleted' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // ==================== ATTENDANCE (Barcode-based) ====================

  async function ensureAttendanceTables(){
    await pool.request().query(`
      IF OBJECT_ID('dbo.SafetyAttendanceBarcode','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAttendanceBarcode(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          UserId INT NOT NULL,
          Barcode NVARCHAR(255) NOT NULL,
          PhotoUrl NVARCHAR(MAX) NULL,
          CreatedDate DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT UQ_Att_User UNIQUE (TenantId, UserId),
          CONSTRAINT UQ_Att_Bar UNIQUE (TenantId, Barcode)
        );
      END;
      IF OBJECT_ID('dbo.SafetyAttendanceLog','U') IS NULL BEGIN
        CREATE TABLE dbo.SafetyAttendanceLog(
          Id INT IDENTITY(1,1) PRIMARY KEY,
          TenantId INT NOT NULL,
          UserId INT NOT NULL,
          Direction NVARCHAR(10) NOT NULL, -- In/Out
          Timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
          Source NVARCHAR(50) NULL, -- Barcode/Face/Thumb
          DeviceId NVARCHAR(100) NULL,
          Notes NVARCHAR(MAX) NULL
        );
        CREATE INDEX IX_Att_Log_Tenant_Time ON dbo.SafetyAttendanceLog(TenantId, Timestamp DESC);
      END;
    `);
  }

  // List barcodes (with user info)
  app.get('/api/attendance/barcodes', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      const { tenantId, q } = req.query;
      const rq = pool.request();
      let where = 'WHERE 1=1';
      if(tenantId){ where += ' AND b.TenantId=@TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if(q){ where += ' AND (u.FullName LIKE @Q OR u.Email LIKE @Q OR b.Barcode LIKE @Q)'; rq.input('Q', sql.NVarChar, `%${q}%`); }
      const r = await rq.query(`
        SELECT b.*, u.FullName, u.Email FROM dbo.SafetyAttendanceBarcode b
        LEFT JOIN dbo.Users u ON u.UserId=b.UserId
        ${where}
        ORDER BY u.FullName
      `);
      return res.json({ success:true, data: r.recordset });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Assign/Update barcode
  app.post('/api/attendance/barcodes', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      const { tenantId=1, userId, barcode, photoUrl=null } = req.body;
      if(!userId || !barcode) return res.status(400).json({ success:false, error:'userId and barcode required' });
      // Upsert by (TenantId, UserId)
      await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('UserId', sql.Int, userId)
        .input('Barcode', sql.NVarChar, barcode)
        .input('PhotoUrl', sql.NVarChar, photoUrl)
        .query(`
          IF EXISTS(SELECT 1 FROM dbo.SafetyAttendanceBarcode WHERE TenantId=@TenantId AND UserId=@UserId)
          BEGIN
            UPDATE dbo.SafetyAttendanceBarcode SET Barcode=@Barcode, PhotoUrl=@PhotoUrl WHERE TenantId=@TenantId AND UserId=@UserId;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.SafetyAttendanceBarcode(TenantId,UserId,Barcode,PhotoUrl) VALUES(@TenantId,@UserId,@Barcode,@PhotoUrl);
          END
        `);
      return res.json({ success:true, message:'Saved' });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  app.delete('/api/attendance/barcodes/:id', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      await pool.request().input('Id', sql.Int, parseInt(req.params.id)).query('DELETE FROM dbo.SafetyAttendanceBarcode WHERE Id=@Id');
      return res.json({ success:true });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Post attendance log (by barcode or userId)
  app.post('/api/attendance/logs', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      let { tenantId=1, userId, barcode, direction, source='Barcode', deviceId=null, notes=null, timestamp=null } = req.body;
      if(!userId){
        if(!barcode) return res.status(400).json({ success:false, error:'userId or barcode required' });
        const r = await pool.request().input('TenantId', sql.Int, tenantId).input('Barcode', sql.NVarChar, barcode)
          .query('SELECT TOP 1 UserId FROM dbo.SafetyAttendanceBarcode WHERE TenantId=@TenantId AND Barcode=@Barcode');
        if(r.recordset.length===0) return res.status(404).json({ success:false, error:'barcode not assigned' });
        userId = r.recordset[0].UserId;
      }
      if(!direction){
        // Auto toggle: last log for user today
        const last = await pool.request().input('TenantId', sql.Int, tenantId).input('UserId', sql.Int, userId)
          .query(`SELECT TOP 1 Direction, Timestamp FROM dbo.SafetyAttendanceLog WHERE TenantId=@TenantId AND UserId=@UserId ORDER BY Timestamp DESC`);
        direction = (last.recordset.length>0 && last.recordset[0].Direction==='In') ? 'Out' : 'In';
      }
      const r2 = await pool.request()
        .input('TenantId', sql.Int, tenantId)
        .input('UserId', sql.Int, userId)
        .input('Direction', sql.NVarChar, direction)
        .input('Timestamp', sql.DateTime2, timestamp || new Date())
        .input('Source', sql.NVarChar, source)
        .input('DeviceId', sql.NVarChar, deviceId)
        .input('Notes', sql.NVarChar, notes)
        .query(`INSERT INTO dbo.SafetyAttendanceLog(TenantId,UserId,Direction,Timestamp,Source,DeviceId,Notes) VALUES(@TenantId,@UserId,@Direction,@Timestamp,@Source,@DeviceId,@Notes);
                SELECT SCOPE_IDENTITY() AS Id;`);
      return res.json({ success:true, id: r2.recordset[0].Id, data: { userId, direction } });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // List logs
  app.get('/api/attendance/logs', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      const { tenantId, userId, from, to } = req.query;
      const rq = pool.request();
      let where = 'WHERE 1=1';
      if(tenantId){ where += ' AND l.TenantId=@TenantId'; rq.input('TenantId', sql.Int, parseInt(tenantId)); }
      if(userId){ where += ' AND l.UserId=@UserId'; rq.input('UserId', sql.Int, parseInt(userId)); }
      if(from){ where += ' AND l.Timestamp >= @Fromd'; rq.input('Fromd', sql.DateTime2, from); }
      if(to){ where += ' AND l.Timestamp <= @Tod'; rq.input('Tod', sql.DateTime2, to); }
      const r = await rq.query(`
        SELECT l.*, u.FullName, u.Email FROM dbo.SafetyAttendanceLog l
        LEFT JOIN dbo.Users u ON u.UserId=l.UserId
        ${where}
        ORDER BY l.Timestamp DESC
      `);
      return res.json({ success:true, data: r.recordset });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  // Current status
  app.get('/api/attendance/status', async (req,res)=>{
    try{
      await ensureAttendanceTables();
      const { tenantId, userId } = req.query;
      if(!tenantId || !userId) return res.status(400).json({ success:false, error:'tenantId and userId required' });
      const r = await pool.request().input('TenantId', sql.Int, parseInt(tenantId)).input('UserId', sql.Int, parseInt(userId))
        .query('SELECT TOP 1 Direction, Timestamp FROM dbo.SafetyAttendanceLog WHERE TenantId=@TenantId AND UserId=@UserId ORDER BY Timestamp DESC');
      return res.json({ success:true, data: r.recordset[0] || null });
    }catch(err){ return res.status(500).json({ success:false, error: err.message }); }
  });

  console.log('✅ Safety API routes configured');
}

module.exports = { setupSafetyRoutes };
