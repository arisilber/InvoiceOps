import express from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET all time entries
router.get('/', async (req, res, next) => {
  try {
    const { client_id, work_date_from, work_date_to } = req.query;
    let queryText = `
      SELECT te.*, c.name as client_name, wt.code as work_type_code, wt.description as work_type_description, 
             i.invoice_number, i.invoice_date, i.status as invoice_status, i.total_cents as invoice_total_cents
      FROM time_entries te
      JOIN clients c ON te.client_id = c.id
      JOIN work_types wt ON te.work_type_id = wt.id
      LEFT JOIN invoices i ON te.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (client_id) {
      queryText += ` AND te.client_id = $${paramCount}`;
      params.push(client_id);
      paramCount++;
    }

    if (work_date_from) {
      queryText += ` AND te.work_date >= $${paramCount}`;
      params.push(work_date_from);
      paramCount++;
    }

    if (work_date_to) {
      queryText += ` AND te.work_date <= $${paramCount}`;
      params.push(work_date_to);
      paramCount++;
    }

    if (req.query.work_type_id) {
      queryText += ` AND te.work_type_id = $${paramCount}`;
      params.push(req.query.work_type_id);
      paramCount++;
    }

    if (req.query.is_invoiced === 'true') {
      queryText += ` AND te.invoice_id IS NOT NULL`;
    } else if (req.query.is_invoiced === 'false') {
      queryText += ` AND te.invoice_id IS NULL`;
    }

    queryText += ' ORDER BY te.work_date DESC, te.created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET distinct project names for a client
router.get('/project-names', async (req, res, next) => {
  try {
    const { client_id } = req.query;
    
    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const result = await query(
      `SELECT DISTINCT project_name
       FROM time_entries
       WHERE client_id = $1
         AND project_name IS NOT NULL
         AND project_name != ''
       ORDER BY project_name`,
      [client_id]
    );

    res.json(result.rows.map(row => row.project_name));
  } catch (error) {
    next(error);
  }
});

// GET time entry by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT te.*, c.name as client_name, wt.code as work_type_code, wt.description as work_type_description
       FROM time_entries te
       JOIN clients c ON te.client_id = c.id
       JOIN work_types wt ON te.work_type_id = wt.id
       WHERE te.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create new time entry
router.post('/', async (req, res, next) => {
  try {
    const { client_id, work_type_id, project_name, work_date, minutes_spent, detail, invoice_id } = req.body;

    if (!client_id || !work_type_id || !project_name || !work_date || !minutes_spent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO time_entries (client_id, work_type_id, project_name, work_date, minutes_spent, detail, invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [client_id, work_type_id, project_name, work_date, minutes_spent, detail || null, invoice_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update time entry
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_id, work_type_id, project_name, work_date, minutes_spent, detail, invoice_id } = req.body;

    // Check if time entry exists and is associated with an invoice
    const existingEntry = await query(
      `SELECT invoice_id FROM time_entries WHERE id = $1`,
      [id]
    );

    if (existingEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Prevent edits to time entries that are associated with an invoice
    if (existingEntry.rows[0].invoice_id !== null) {
      return res.status(403).json({ 
        error: 'Cannot edit time entry that is associated with an invoice' 
      });
    }

    const result = await query(
      `UPDATE time_entries
       SET client_id = $1, work_type_id = $2, project_name = $3, work_date = $4, minutes_spent = $5, detail = $6, invoice_id = $7
       WHERE id = $8
       RETURNING *`,
      [client_id, work_type_id, project_name, work_date, minutes_spent, detail || null, invoice_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE time entry
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if time entry exists and is associated with an invoice
    const existingEntry = await query(
      `SELECT invoice_id FROM time_entries WHERE id = $1`,
      [id]
    );

    if (existingEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Prevent deletion of time entries that are associated with an invoice
    if (existingEntry.rows[0].invoice_id !== null) {
      return res.status(403).json({ 
        error: 'Cannot delete time entry that is associated with an invoice' 
      });
    }

    const result = await query('DELETE FROM time_entries WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ message: 'Time entry deleted successfully', time_entry: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST bulk upload time entries
router.post('/bulk', async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const entries = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Expected an array of time entries' });
    }

    const insertedEntries = [];
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { client_id, work_type_id, project_name, work_date, minutes_spent, detail, invoice_id } = entry;

      // Validate required fields (project_name is optional)
      if (!client_id || !work_type_id || !work_date || !minutes_spent) {
        errors.push({
          index: i,
          error: 'Missing required fields',
          entry
        });
        continue;
      }

      // Validate minutes_spent is positive
      if (minutes_spent <= 0) {
        errors.push({
          index: i,
          error: 'minutes_spent must be greater than 0',
          entry
        });
        continue;
      }

      try {
        const result = await client.query(
          `INSERT INTO time_entries (client_id, work_type_id, project_name, work_date, minutes_spent, detail, invoice_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [client_id, work_type_id, project_name || '', work_date, minutes_spent, detail || null, invoice_id || null]
        );
        insertedEntries.push(result.rows[0]);
      } catch (err) {
        // Check if it's a foreign key constraint error
        if (err.code === '23503') {
          errors.push({
            index: i,
            error: `Invalid client_id or work_type_id: ${err.message}`,
            entry
          });
        } else {
          errors.push({
            index: i,
            error: err.message,
            entry
          });
        }
      }
    }

    if (errors.length > 0 && insertedEntries.length === 0) {
      // If all entries failed, rollback
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'All entries failed validation',
        errors: errors
      });
    }

    if (errors.length > 0) {
      // Some entries failed, but some succeeded - commit what we can
      await client.query('COMMIT');
      return res.status(207).json({
        success_count: insertedEntries.length,
        error_count: errors.length,
        errors: errors,
        entries: insertedEntries
      });
    }

    // All entries succeeded
    await client.query('COMMIT');
    res.status(201).json({
      success_count: insertedEntries.length,
      error_count: 0,
      entries: insertedEntries
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;

