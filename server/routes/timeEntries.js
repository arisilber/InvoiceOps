import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// GET all time entries
router.get('/', async (req, res, next) => {
  try {
    const { client_id, work_date_from, work_date_to } = req.query;
    let queryText = `
      SELECT te.*, c.name as client_name, wt.code as work_type_code, wt.description as work_type_description, i.invoice_number
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
    const result = await query('DELETE FROM time_entries WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ message: 'Time entry deleted successfully', time_entry: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

