import express from 'express';
import { query } from '../db/connection.js';

const router = express.Router();

// GET all clients
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET client by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create new client
router.post('/', async (req, res, next) => {
  try {
    const { type, name, email, hourly_rate_cents, discount_percent } = req.body;
    
    if (!type || !name || !email || hourly_rate_cents === undefined || discount_percent === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await query(
      `INSERT INTO clients (type, name, email, hourly_rate_cents, discount_percent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, name, email, hourly_rate_cents, discount_percent]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Client with this email already exists' });
    }
    next(error);
  }
});

// PUT update client
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, name, email, hourly_rate_cents, discount_percent } = req.body;
    
    const result = await query(
      `UPDATE clients
       SET type = $1, name = $2, email = $3, hourly_rate_cents = $4, discount_percent = $5
       WHERE id = $6
       RETURNING *`,
      [type, name, email, hourly_rate_cents, discount_percent, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE client
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json({ message: 'Client deleted successfully', client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

