/**
 * Waste Management API Routes
 * Handles CRUD operations for waste management
 */

const express = require('express');
const sql = require('mssql');
const router = express.Router();

/**
 * WASTE MANAGEMENT ROUTES
 */

// GET all waste management records
router.get('/management', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await new sql.Request(pool)
      
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

// GET single waste management record
router.get('/management/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await new sql.Request(pool)
      
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

    if (!dateOfWasteGeneration || !wasteCategory || !typeOfWaste || !quantityOfWaste || 
        !unit || !sourceOfWaste || !collectionMethod || !storageMethod || 
        !storageDuration || !warehouseName || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const pool = req.app.locals.pool;
    const result = await new sql.Request(pool)
      
      .input('date_of_waste_generation', dateOfWasteGeneration)
      .input('waste_category', wasteCategory)
      .input('type_of_waste', typeOfWaste)
      .input('quantity_of_waste', quantityOfWaste)
      .input('unit', unit)
      .input('source_of_waste', sourceOfWaste)
      .input('collection_method', collectionMethod)
      .input('storage_method', storageMethod)
      .input('storage_duration_days', parseInt(storageDuration))
      .input('warehouse_name', warehouseName)
      .input('location', location)
      .input('notes', notes || null)
      .input('created_by', 'System')
      .execute('sp_waste_management_create');

    res.json({
      success: true,
      data: result.recordset[0],
      message: 'Waste management record created successfully'
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
    const id = req.params.id;
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

    if (!dateOfWasteGeneration || !wasteCategory || !typeOfWaste || !quantityOfWaste || 
        !unit || !sourceOfWaste || !collectionMethod || !storageMethod || 
        !storageDuration || !warehouseName || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const pool = req.app.locals.pool;
    await new sql.Request(pool)
      
      .input('id', id)
      .input('date_of_waste_generation', dateOfWasteGeneration)
      .input('waste_category', wasteCategory)
      .input('type_of_waste', typeOfWaste)
      .input('quantity_of_waste', quantityOfWaste)
      .input('unit', unit)
      .input('source_of_waste', sourceOfWaste)
      .input('collection_method', collectionMethod)
      .input('storage_method', storageMethod)
      .input('storage_duration_days', parseInt(storageDuration))
      .input('warehouse_name', warehouseName)
      .input('location', location)
      .input('notes', notes || null)
      .input('updated_by', 'System')
      .execute('sp_waste_management_update');

    res.json({
      success: true,
      message: 'Waste management record updated successfully'
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
    const pool = req.app.locals.pool;
    await new sql.Request(pool)
      
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

module.exports = router;
