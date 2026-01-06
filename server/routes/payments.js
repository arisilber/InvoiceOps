import express from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET all payments
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, 
       COALESCE(SUM(pa.amount_cents), 0) as applied_amount_cents
       FROM payments p
       LEFT JOIN payment_applications pa ON p.id = pa.payment_id
       GROUP BY p.id
       ORDER BY p.payment_date DESC, p.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET payment by ID with applications
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get payment
    const paymentResult = await query('SELECT * FROM payments WHERE id = $1', [id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const payment = paymentResult.rows[0];
    
    // Get payment applications
    const applicationsResult = await query(
      `SELECT pa.*, i.invoice_number, i.invoice_date, c.name as client_name
       FROM payment_applications pa
       JOIN invoices i ON pa.invoice_id = i.id
       JOIN clients c ON i.client_id = c.id
       WHERE pa.payment_id = $1
       ORDER BY pa.id`,
      [id]
    );
    
    payment.applications = applicationsResult.rows;
    
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// POST create new payment
router.post('/', async (req, res, next) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { payment_date, amount_cents, note, applications } = req.body;
    
    if (!payment_date || !amount_cents) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert payment
    const paymentResult = await client.query(
      `INSERT INTO payments (payment_date, amount_cents, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [payment_date, amount_cents, note || null]
    );
    
    const payment = paymentResult.rows[0];
    
    // Insert payment applications
    if (applications && Array.isArray(applications)) {
      for (const app of applications) {
        await client.query(
          `INSERT INTO payment_applications (payment_id, invoice_id, amount_cents)
           VALUES ($1, $2, $3)`,
          [payment.id, app.invoice_id, app.amount_cents]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch complete payment with applications
    const completePayment = await query('SELECT * FROM payments WHERE id = $1', [payment.id]);
    const paymentApplications = await query(
      `SELECT pa.*, i.invoice_number, i.invoice_date, c.name as client_name
       FROM payment_applications pa
       JOIN invoices i ON pa.invoice_id = i.id
       JOIN clients c ON i.client_id = c.id
       WHERE pa.payment_id = $1
       ORDER BY pa.id`,
      [payment.id]
    );
    
    const result = completePayment.rows[0];
    result.applications = paymentApplications.rows;
    
    res.status(201).json(result);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// DELETE payment
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM payments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ message: 'Payment deleted successfully', payment: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

