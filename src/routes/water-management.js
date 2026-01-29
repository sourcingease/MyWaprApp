/**
 * Water Management API Routes
 * Handles CRUD operations for water buying, rain collection, and water usage
 */

const express = require('express');
const sql = require('mssql');

function setupWaterManagementRoutes(app, pool) {
  const router = express.Router();

  /**
   * WATER BUYING ROUTES
   */

  // GET all water buying records
  router.get('/buying', async (req, res) => {
    try {
      const result = await pool.request()
        .query('SELECT * FROM water_buying ORDER BY created_at DESC');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching water buying records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET single water buying record
  router.get('/buying/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM water_buying WHERE id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Water buying record not found'
        });
      }
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching water buying record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // CREATE water buying record
  router.post('/buying', async (req, res) => {
    try {
      const {
        supplierName,
        supplierContact,
        dateOfPurchase,
        quantityPurchased,
        unit,
        costPerUnit,
        totalCost,
        paymentMethod,
        invoiceNumber,
        waterTank,
        notes
      } = req.body;

      // Validation
      if (!supplierName || !invoiceNumber || !dateOfPurchase) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await pool.request()
        .input('supplier_name', supplierName)
        .input('supplier_contact', supplierContact)
        .input('date_of_purchase', new Date(dateOfPurchase))
        .input('quantity_purchased', quantityPurchased)
        .input('unit', unit)
        .input('cost_per_unit', costPerUnit)
        .input('total_cost', totalCost)
        .input('payment_method', paymentMethod)
        .input('invoice_number', invoiceNumber)
        .input('water_tank', waterTank)
        .input('notes', notes || null)
        .input('created_by', 'system')
        .execute('sp_water_buying_create');

      res.status(201).json({
        success: true,
        message: 'Water buying record created successfully',
        id: result.recordset[0].id,
        data: req.body
      });
    } catch (error) {
      console.error('Error creating water buying record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // UPDATE water buying record
  router.put('/buying/:id', async (req, res) => {
    try {
      const {
        supplierName,
        supplierContact,
        dateOfPurchase,
        quantityPurchased,
        unit,
        costPerUnit,
        totalCost,
        paymentMethod,
        invoiceNumber,
        waterTank,
        notes
      } = req.body;

      await pool.request()
        .input('id', req.params.id)
        .input('supplier_name', supplierName)
        .input('supplier_contact', supplierContact)
        .input('date_of_purchase', new Date(dateOfPurchase))
        .input('quantity_purchased', quantityPurchased)
        .input('unit', unit)
        .input('cost_per_unit', costPerUnit)
        .input('total_cost', totalCost)
        .input('payment_method', paymentMethod)
        .input('invoice_number', invoiceNumber)
        .input('water_tank', waterTank)
        .input('notes', notes || null)
        .input('updated_by', 'system')
        .execute('sp_water_buying_update');

      res.json({
        success: true,
        message: 'Water buying record updated successfully',
        id: req.params.id
      });
    } catch (error) {
      console.error('Error updating water buying record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE water buying record
  router.delete('/buying/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_buying_delete');

      res.json({
        success: true,
        message: 'Water buying record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting water buying record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * WATER RAIN COLLECTION ROUTES
   */

  // GET all rain collection records
  router.get('/rain', async (req, res) => {
    try {
      const result = await pool.request()
        .query('SELECT * FROM water_rain_collection ORDER BY created_at DESC');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching rain collection records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET single rain collection record
  router.get('/rain/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM water_rain_collection WHERE id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rain collection record not found'
        });
      }
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching rain collection record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // CREATE rain collection record
  router.post('/rain', async (req, res) => {
    try {
      const {
        collectionDate,
        collectionLocation,
        quantityCollected,
        collectionUnit,
        rainTank,
        waterQuality,
        treatmentRequired,
        treatmentType,
        collectedBy,
        notes
      } = req.body;

      const result = await pool.request()
        .input('collection_date', new Date(collectionDate))
        .input('collection_location', collectionLocation)
        .input('quantity_collected', quantityCollected)
        .input('collection_unit', collectionUnit)
        .input('rain_tank', rainTank)
        .input('water_quality', waterQuality)
        .input('treatment_required', treatmentRequired)
        .input('treatment_type', treatmentType || null)
        .input('collected_by', collectedBy)
        .input('notes', notes || null)
        .input('created_by', 'system')
        .execute('sp_water_rain_create');

      res.status(201).json({
        success: true,
        message: 'Rain collection record created successfully',
        id: result.recordset[0].id,
        data: req.body
      });
    } catch (error) {
      console.error('Error creating rain collection record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // UPDATE rain collection record
  router.put('/rain/:id', async (req, res) => {
    try {
      const {
        collectionDate,
        collectionLocation,
        quantityCollected,
        collectionUnit,
        rainTank,
        waterQuality,
        treatmentRequired,
        treatmentType,
        collectedBy,
        notes
      } = req.body;

      await pool.request()
        .input('id', req.params.id)
        .input('collection_date', new Date(collectionDate))
        .input('collection_location', collectionLocation)
        .input('quantity_collected', quantityCollected)
        .input('collection_unit', collectionUnit)
        .input('rain_tank', rainTank)
        .input('water_quality', waterQuality)
        .input('treatment_required', treatmentRequired)
        .input('treatment_type', treatmentType || null)
        .input('collected_by', collectedBy)
        .input('notes', notes || null)
        .input('updated_by', 'system')
        .execute('sp_water_rain_update');

      res.json({
        success: true,
        message: 'Rain collection record updated successfully',
        id: req.params.id
      });
    } catch (error) {
      console.error('Error updating rain collection record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE rain collection record
  router.delete('/rain/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_rain_delete');

      res.json({
        success: true,
        message: 'Rain collection record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting rain collection record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * WATER USAGE ROUTES
   */

  // GET all water usage records
  router.get('/usage', async (req, res) => {
    try {
      const result = await pool.request()
        .query('SELECT * FROM water_usage ORDER BY created_at DESC');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching water usage records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET single water usage record
  router.get('/usage/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM water_usage WHERE id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Water usage record not found'
        });
      }
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching water usage record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // CREATE water usage record
  router.post('/usage', async (req, res) => {
    try {
      const {
        department,
        dateOfUsage,
        quantityUsed,
        unit,
        purposeOfUsage,
        waterEfficientTech,
        reductionPercentage,
        sourceOfWater,
        availableQty,
        usageMonth,
        notes
      } = req.body;

      // Validation
      if (!department || !dateOfUsage || !quantityUsed) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await pool.request()
        .input('department', department)
        .input('date_of_usage', new Date(dateOfUsage))
        .input('quantity_used', quantityUsed)
        .input('unit', unit)
        .input('purpose_of_usage', purposeOfUsage)
        .input('water_efficient_tech', waterEfficientTech)
        .input('reduction_percentage', reductionPercentage || null)
        .input('source_of_water', sourceOfWater)
        .input('available_qty', availableQty || null)
        .input('usage_month', usageMonth ? new Date(usageMonth) : null)
        .input('notes', notes || null)
        .input('created_by', 'system')
        .execute('sp_water_usage_create');

      res.status(201).json({
        success: true,
        message: 'Water usage record created successfully',
        id: result.recordset[0].id,
        data: req.body
      });
    } catch (error) {
      console.error('Error creating water usage record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // UPDATE water usage record
  router.put('/usage/:id', async (req, res) => {
    try {
      const {
        department,
        dateOfUsage,
        quantityUsed,
        unit,
        purposeOfUsage,
        waterEfficientTech,
        reductionPercentage,
        sourceOfWater,
        availableQty,
        usageMonth,
        notes
      } = req.body;

      await pool.request()
        .input('id', req.params.id)
        .input('department', department)
        .input('date_of_usage', new Date(dateOfUsage))
        .input('quantity_used', quantityUsed)
        .input('unit', unit)
        .input('purpose_of_usage', purposeOfUsage)
        .input('water_efficient_tech', waterEfficientTech)
        .input('reduction_percentage', reductionPercentage || null)
        .input('source_of_water', sourceOfWater)
        .input('available_qty', availableQty || null)
        .input('usage_month', usageMonth ? new Date(usageMonth) : null)
        .input('notes', notes || null)
        .input('updated_by', 'system')
        .execute('sp_water_usage_update');

      res.json({
        success: true,
        message: 'Water usage record updated successfully',
        id: req.params.id
      });
    } catch (error) {
      console.error('Error updating water usage record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE water usage record
  router.delete('/usage/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_usage_delete');

      res.json({
        success: true,
        message: 'Water usage record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting water usage record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * WATER DISCHARGE QUALITY MONITORING ROUTES
   */

  // GET all discharge quality records
  router.get('/discharge', async (req, res) => {
    try {
      const result = await pool.request()
        .query('SELECT * FROM water_discharge_quality ORDER BY created_at DESC');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching discharge quality records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET single discharge quality record
  router.get('/discharge/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM water_discharge_quality WHERE id = @id');
      
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Discharge quality record not found'
        });
      }
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching discharge quality record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // CREATE discharge quality record
  router.post('/discharge', async (req, res) => {
    try {
      const {
        monitoringFrequency,
        samplingPointsLocations,
        personResponsible,
        commentsObservations,
        laboratoryUsed,
        parametersMonitored,
        resultValue,
        units,
        complianceStandards,
        monitoringEquipment,
        monitoringDate
      } = req.body;

      const result = await pool.request()
        .input('monitoring_frequency', monitoringFrequency)
        .input('sampling_points_locations', samplingPointsLocations)
        .input('person_responsible', personResponsible)
        .input('comments_observations', commentsObservations || null)
        .input('laboratory_used', laboratoryUsed || null)
        .input('parameters_monitored', parametersMonitored)
        .input('result_value', resultValue ? parseFloat(resultValue) : null)
        .input('units', units || null)
        .input('compliance_standards', complianceStandards || null)
        .input('monitoring_equipment', monitoringEquipment || null)
        .input('monitoring_date', new Date(monitoringDate))
        .input('created_by', 'system')
        .execute('sp_water_discharge_create');

      res.json({
        success: true,
        message: 'Discharge quality record created successfully',
        id: result.recordset[0].id
      });
    } catch (error) {
      console.error('Error creating discharge quality record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // UPDATE discharge quality record
  router.put('/discharge/:id', async (req, res) => {
    try {
      const {
        monitoringFrequency,
        samplingPointsLocations,
        personResponsible,
        commentsObservations,
        laboratoryUsed,
        parametersMonitored,
        resultValue,
        units,
        complianceStandards,
        monitoringEquipment,
        monitoringDate
      } = req.body;

      await pool.request()
        .input('id', req.params.id)
        .input('monitoring_frequency', monitoringFrequency)
        .input('sampling_points_locations', samplingPointsLocations)
        .input('person_responsible', personResponsible)
        .input('comments_observations', commentsObservations || null)
        .input('laboratory_used', laboratoryUsed || null)
        .input('parameters_monitored', parametersMonitored)
        .input('result_value', resultValue ? parseFloat(resultValue) : null)
        .input('units', units || null)
        .input('compliance_standards', complianceStandards || null)
        .input('monitoring_equipment', monitoringEquipment || null)
        .input('monitoring_date', new Date(monitoringDate))
        .input('updated_by', 'system')
        .execute('sp_water_discharge_update');

      res.json({
        success: true,
        message: 'Discharge quality record updated successfully',
        id: req.params.id
      });
    } catch (error) {
      console.error('Error updating discharge quality record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE discharge quality record
  router.delete('/discharge/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_discharge_delete');

      res.json({
        success: true,
        message: 'Discharge quality record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting discharge quality record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * WATER RECYCLING ROUTES
   */

  // GET all water recycling records
  router.get('/recycling', async (req, res) => {
    try {
      const result = await pool.request()
        .execute('sp_water_recycling_read');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching water recycling records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST create water recycling record
  router.post('/recycling', async (req, res) => {
    try {
      const { department, dateOfRecycling, recyclingMethod, quantityRecycled, unit, waterTank, notes } = req.body;
      
      if (!department || !dateOfRecycling || !recyclingMethod || !quantityRecycled || !unit || !waterTank) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await pool.request()
        .input('department', department)
        .input('date_of_recycling', dateOfRecycling)
        .input('recycling_method', recyclingMethod)
        .input('quantity_recycled', quantityRecycled)
        .input('unit', unit)
        .input('water_tank', waterTank)
        .input('notes', notes || null)
        .input('created_by', 'System')
        .execute('sp_water_recycling_create');

      res.json({
        success: true,
        data: result.recordset[0],
        message: 'Water recycling record created successfully'
      });
    } catch (error) {
      console.error('Error creating water recycling record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT update water recycling record
  router.put('/recycling/:id', async (req, res) => {
    try {
      const { department, dateOfRecycling, recyclingMethod, quantityRecycled, unit, waterTank, notes } = req.body;
      const id = req.params.id;

      if (!department || !dateOfRecycling || !recyclingMethod || !quantityRecycled || !unit || !waterTank) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      await pool.request()
        .input('id', id)
        .input('department', department)
        .input('date_of_recycling', dateOfRecycling)
        .input('recycling_method', recyclingMethod)
        .input('quantity_recycled', quantityRecycled)
        .input('unit', unit)
        .input('water_tank', waterTank)
        .input('notes', notes || null)
        .input('updated_by', 'System')
        .execute('sp_water_recycling_update');

      res.json({
        success: true,
        message: 'Water recycling record updated successfully'
      });
    } catch (error) {
      console.error('Error updating water recycling record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE water recycling record
  router.delete('/recycling/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_recycling_delete');

      res.json({
        success: true,
        message: 'Water recycling record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting water recycling record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * WATER WASTE ROUTES
   */

  // GET all water waste records
  router.get('/waste', async (req, res) => {
    try {
      const result = await pool.request()
        .execute('sp_water_waste_read');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching water waste records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST create water waste record
  router.post('/waste', async (req, res) => {
    try {
      const { 
        department, dateOfWasteGeneration, quantityOfWastewater, unit, 
        typeOfWastewater, wastewaterTreatmentProcess, percentageOfPollutantRemoval,
        disposalMethod, quantityDisposed, disposedUnit, notes 
      } = req.body;
      
      if (!department || !dateOfWasteGeneration || !quantityOfWastewater || !unit || 
          !typeOfWastewater || !wastewaterTreatmentProcess || !disposalMethod || !quantityDisposed || !disposedUnit) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await pool.request()
        .input('department', department)
        .input('date_of_waste_generation', dateOfWasteGeneration)
        .input('quantity_of_wastewater', quantityOfWastewater)
        .input('unit', unit)
        .input('type_of_wastewater', typeOfWastewater)
        .input('wastewater_treatment_process', wastewaterTreatmentProcess)
        .input('percentage_of_pollutant_removal', percentageOfPollutantRemoval || 0)
        .input('disposal_method', disposalMethod)
        .input('quantity_disposed', quantityDisposed)
        .input('disposed_unit', disposedUnit)
        .input('notes', notes || null)
        .input('created_by', 'System')
        .execute('sp_water_waste_create');

      res.json({
        success: true,
        data: result.recordset[0],
        message: 'Water waste record created successfully'
      });
    } catch (error) {
      console.error('Error creating water waste record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT update water waste record
  router.put('/waste/:id', async (req, res) => {
    try {
      const { 
        department, dateOfWasteGeneration, quantityOfWastewater, unit, 
        typeOfWastewater, wastewaterTreatmentProcess, percentageOfPollutantRemoval,
        disposalMethod, quantityDisposed, disposedUnit, notes 
      } = req.body;
      const id = req.params.id;

      if (!department || !dateOfWasteGeneration || !quantityOfWastewater || !unit || 
          !typeOfWastewater || !wastewaterTreatmentProcess || !disposalMethod || !quantityDisposed || !disposedUnit) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      await pool.request()
        .input('id', id)
        .input('department', department)
        .input('date_of_waste_generation', dateOfWasteGeneration)
        .input('quantity_of_wastewater', quantityOfWastewater)
        .input('unit', unit)
        .input('type_of_wastewater', typeOfWastewater)
        .input('wastewater_treatment_process', wastewaterTreatmentProcess)
        .input('percentage_of_pollutant_removal', percentageOfPollutantRemoval || 0)
        .input('disposal_method', disposalMethod)
        .input('quantity_disposed', quantityDisposed)
        .input('disposed_unit', disposedUnit)
        .input('notes', notes || null)
        .input('updated_by', 'System')
        .execute('sp_water_waste_update');

      res.json({
        success: true,
        message: 'Water waste record updated successfully'
      });
    } catch (error) {
      console.error('Error updating water waste record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE water waste record
  router.delete('/waste/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_water_waste_delete');

      res.json({
        success: true,
        message: 'Water waste record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting water waste record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.use('/api/water', router);
}

module.exports = { setupWaterManagementRoutes };
