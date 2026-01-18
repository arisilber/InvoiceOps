import express from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET system-wide settings
router.get('/', async (req, res, next) => {
  try {
    // Get all company settings from system_settings table
    const result = await query(
      "SELECT key, value FROM system_settings WHERE key IN ('company_name', 'company_address', 'company_email')"
    );
    
    const settings = {
      company_name: null,
      company_address: null,
      company_email: null
    };
    
    result.rows.forEach(row => {
      if (row.key === 'company_name') {
        settings.company_name = row.value;
      } else if (row.key === 'company_address') {
        settings.company_address = row.value;
      } else if (row.key === 'company_email') {
        settings.company_email = row.value;
      }
    });
    
    res.json(settings);
  } catch (error) {
    // If table doesn't exist, return empty settings
    if (error.code === '42P01') { // Undefined table
      return res.json({ company_name: null, company_address: null, company_email: null });
    }
    next(error);
  }
});

// PUT update system-wide settings
router.put('/', async (req, res, next) => {
  const client = await getClient();
  try {
    const { company_name, company_address, company_email } = req.body;
    
    try {
      await client.query('BEGIN');
      
      // Upsert each setting
      const settingsToUpdate = [
        { key: 'company_name', value: company_name || null },
        { key: 'company_address', value: company_address || null },
        { key: 'company_email', value: company_email || null }
      ];
      
      const results = {};
      
      for (const setting of settingsToUpdate) {
        const result = await client.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key)
           DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
           RETURNING key, value`,
          [setting.key, setting.value]
        );
        
        if (result.rows.length > 0) {
          results[setting.key] = result.rows[0].value || null;
        } else {
          results[setting.key] = setting.value;
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        company_name: results['company_name'] || null,
        company_address: results['company_address'] || null,
        company_email: results['company_email'] || null
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    // If table doesn't exist, return a helpful error
    if (error.code === '42P01') { // Undefined table
      return res.status(500).json({ 
        error: 'Settings feature not available. Please run database migration to create system_settings table.' 
      });
    }
    next(error);
  }
});

export default router;
