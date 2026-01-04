import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// GET all work types
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM work_types ORDER BY code');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET work type by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM work_types WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create new work type
router.post('/', async (req, res, next) => {
  try {
    const { code, description } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await query(
      'INSERT INTO work_types (code, description) VALUES ($1, $2) RETURNING *',
      [code, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Work type with this code already exists' });
    }
    next(error);
  }
});

// PUT update work type
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, description } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await query(
      'UPDATE work_types SET code = $1, description = $2 WHERE id = $3 RETURNING *',
      [code, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Work type with this code already exists' });
    }
    next(error);
  }
});

// DELETE work type
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Attempt to delete. The database will throw a foreign key violation (23503)
    // if it's being used in time_entries or invoice_lines because of ON DELETE RESTRICT.
    const result = await query('DELETE FROM work_types WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work type not found' });
    }

    res.json({ message: 'Work type deleted successfully' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Cannot delete work type because it is being used by time entries or invoices.'
      });
    }
    next(error);
  }
});

export default router;

