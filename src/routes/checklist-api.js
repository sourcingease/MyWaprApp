const express = require('express');
const sql = require('mssql');

function setupChecklistRoutes(app, pool) {
  
  // Initialize tables (call this once)
  app.post('/api/safety/checklist/init', async (req, res) => {
    try {
      // Create SafetyChecklistHeadings table
      await pool.request().query(`
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
        END
      `);
      
      // Create SafetyChecklistItems table
      await pool.request().query(`
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
        END
      `);
      
      // Create indexes
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistHeadings_TabId' AND object_id = OBJECT_ID('SafetyChecklistHeadings'))
        BEGIN
            CREATE INDEX IX_SafetyChecklistHeadings_TabId ON SafetyChecklistHeadings(tab_id);
        END
      `);
      
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SafetyChecklistItems_TabId' AND object_id = OBJECT_ID('SafetyChecklistItems'))
        BEGIN
            CREATE INDEX IX_SafetyChecklistItems_TabId ON SafetyChecklistItems(tab_id, heading_slug);
        END
      `);
      
      res.json({ success: true, message: 'Database tables initialized successfully' });
    } catch (err) {
      console.error('Error initializing tables:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all custom headings for a tab
  app.get('/api/safety/checklist/headings/:tabId', async (req, res) => {
    try {
      const { tabId } = req.params;
      
      const result = await pool.request()
        .input('tabId', sql.NVarChar, tabId)
        .query(`
          SELECT id, tab_id, heading_text, heading_slug, display_order, created_at
          FROM SafetyChecklistHeadings
          WHERE tab_id = @tabId
          ORDER BY display_order, id
        `);
      
      res.json(result.recordset);
    } catch (err) {
      console.error('Error fetching checklist headings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new custom heading
  app.post('/api/safety/checklist/headings', async (req, res) => {
    try {
      const { tabId, headingText, headingSlug, displayOrder } = req.body;
      
      if (!tabId || !headingText || !headingSlug) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const result = await pool.request()
        .input('tabId', sql.NVarChar, tabId)
        .input('headingText', sql.NVarChar, headingText)
        .input('headingSlug', sql.NVarChar, headingSlug)
        .input('displayOrder', sql.Int, displayOrder || 0)
        .query(`
          INSERT INTO SafetyChecklistHeadings (tab_id, heading_text, heading_slug, display_order)
          VALUES (@tabId, @headingText, @headingSlug, @displayOrder);
          SELECT SCOPE_IDENTITY() AS id;
        `);
      
      res.json({ 
        success: true, 
        id: result.recordset[0].id,
        message: 'Heading created successfully' 
      });
    } catch (err) {
      console.error('Error creating heading:', err);
      if (err.number === 2627) { // Unique constraint violation
        res.status(409).json({ error: 'Heading already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // Delete a custom heading
  app.delete('/api/safety/checklist/headings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM SafetyChecklistHeadings WHERE id = @id');
      
      res.json({ success: true, message: 'Heading deleted successfully' });
    } catch (err) {
      console.error('Error deleting heading:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all custom items for a tab
  app.get('/api/safety/checklist/items/:tabId', async (req, res) => {
    try {
      const { tabId } = req.params;
      
      const result = await pool.request()
        .input('tabId', sql.NVarChar, tabId)
        .query(`
          SELECT id, tab_id, heading_text, heading_slug, item_text, options, 
                 display_order, created_at, is_active
          FROM SafetyChecklistItems
          WHERE tab_id = @tabId AND is_active = 1
          ORDER BY heading_slug, display_order, id
        `);
      
      res.json(result.recordset);
    } catch (err) {
      console.error('Error fetching checklist items:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new checklist item
  app.post('/api/safety/checklist/items', async (req, res) => {
    try {
      const { tabId, headingText, headingSlug, itemText, options, displayOrder } = req.body;
      
      if (!tabId || !headingText || !headingSlug || !itemText || !options) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const optionsStr = Array.isArray(options) ? options.join(',') : options;
      
      const result = await pool.request()
        .input('tabId', sql.NVarChar, tabId)
        .input('headingText', sql.NVarChar, headingText)
        .input('headingSlug', sql.NVarChar, headingSlug)
        .input('itemText', sql.NVarChar, itemText)
        .input('options', sql.NVarChar, optionsStr)
        .input('displayOrder', sql.Int, displayOrder || 0)
        .query(`
          INSERT INTO SafetyChecklistItems 
          (tab_id, heading_text, heading_slug, item_text, options, display_order)
          VALUES (@tabId, @headingText, @headingSlug, @itemText, @options, @displayOrder);
          SELECT SCOPE_IDENTITY() AS id;
        `);
      
      res.json({ 
        success: true, 
        id: result.recordset[0].id,
        message: 'Item created successfully' 
      });
    } catch (err) {
      console.error('Error creating item:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a checklist item
  app.delete('/api/safety/checklist/items/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Soft delete
      await pool.request()
        .input('id', sql.Int, id)
        .query('UPDATE SafetyChecklistItems SET is_active = 0, updated_at = GETDATE() WHERE id = @id');
      
      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
      console.error('Error deleting item:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { setupChecklistRoutes };
