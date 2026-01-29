/**
 * Waste Management API Routes
 * Handles CRUD operations for waste management
 */

const express = require('express');
const sql = require('mssql');

function setupWasteManagementRoutes(app, pool) {
  const router = express.Router();

  /**
   * WASTE MANAGEMENT ROUTES
   */

  // GET all waste management records
  router.get('/management', async (req, res) => {
    try {
      const result = await pool.request()
        .execute('sp_waste_management_read');
      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });
    } catch (error) {
      console.error('Error fetching waste management records:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST create waste management record
  router.post('/management', async (req, res) => {
    try {
      const {
        dateOfWasteGeneration,
        wasteCategory,
        typeOfWaste,
        quantityOfWaste,
        unit,
        sourceOfWaste,
        collectionMethod,
        storageMethod,
        storageDuration,
        warehouseName,
        location,
        notes
      } = req.body;

      // Validation
      if (!dateOfWasteGeneration || !wasteCategory || !typeOfWaste || !quantityOfWaste) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await pool.request()
        .input('date_of_waste_generation', new Date(dateOfWasteGeneration))
        .input('waste_category', wasteCategory)
        .input('type_of_waste', typeOfWaste)
        .input('quantity_of_waste', quantityOfWaste)
        .input('unit', unit || '')
        .input('source_of_waste', sourceOfWaste || '')
        .input('collection_method', collectionMethod || '')
        .input('storage_method', storageMethod || '')
        .input('storage_duration_days', storageDuration || 0)
        .input('warehouse_name', warehouseName || '')
        .input('location', location || '')
        .input('notes', notes || null)
        .input('created_by', 'system')
        .execute('sp_waste_management_create');

      res.status(201).json({
        success: true,
        message: 'Waste management record created successfully',
        id: result.recordset[0]?.id,
        data: req.body
      });
    } catch (error) {
      console.error('Error creating waste management record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT update waste management record
  router.put('/management/:id', async (req, res) => {
    try {
      const {
        dateOfWasteGeneration,
        wasteCategory,
        typeOfWaste,
        quantityOfWaste,
        unit,
        sourceOfWaste,
        collectionMethod,
        storageMethod,
        storageDuration,
        warehouseName,
        location,
        notes
      } = req.body;

      await pool.request()
        .input('id', req.params.id)
        .input('date_of_waste_generation', new Date(dateOfWasteGeneration))
        .input('waste_category', wasteCategory)
        .input('type_of_waste', typeOfWaste)
        .input('quantity_of_waste', quantityOfWaste)
        .input('unit', unit || '')
        .input('source_of_waste', sourceOfWaste || '')
        .input('collection_method', collectionMethod || '')
        .input('storage_method', storageMethod || '')
        .input('storage_duration_days', storageDuration || 0)
        .input('warehouse_name', warehouseName || '')
        .input('location', location || '')
        .input('notes', notes || null)
        .input('updated_by', 'system')
        .execute('sp_waste_management_update');

      res.json({
        success: true,
        message: 'Waste management record updated successfully',
        id: req.params.id
      });
    } catch (error) {
      console.error('Error updating waste management record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE waste management record
  router.delete('/management/:id', async (req, res) => {
    try {
      await pool.request()
        .input('id', req.params.id)
        .execute('sp_waste_management_delete');

      res.json({
        success: true,
        message: 'Waste management record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting waste management record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET single waste management record
  router.get('/management/:id', async (req, res) => {
    try {
      const result = await pool.request()
        .input('id', req.params.id)
        .query('SELECT * FROM waste_management WHERE id = @id');

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Waste management record not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching waste management record:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.use('/api/waste', router);
}

module.exports = { setupWasteManagementRoutes };
