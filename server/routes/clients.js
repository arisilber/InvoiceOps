import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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

// GET client dashboard stats
router.get('/:id/dashboard', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify client exists
    const clientResult = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientResult.rows[0];
    
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // 1. Amount uninvoiced (time tracked not in an invoice)
    // Calculate with discount applied (same as invoice calculation)
    const uninvoicedResult = await query(
      `SELECT COALESCE(SUM(minutes_spent), 0) as total_minutes
       FROM time_entries
       WHERE client_id = $1 AND invoice_id IS NULL`,
      [id]
    );
    
    const totalMinutes = parseInt(uninvoicedResult.rows[0].total_minutes) || 0;
    const hourlyRateCents = parseInt(client.hourly_rate_cents) || 0;
    const discountPercent = parseFloat(client.discount_percent) || 0;
    
    // Calculate pre-discount amount
    const preDiscountAmount = Math.round((totalMinutes / 60) * hourlyRateCents);
    // Apply discount
    const discountAmount = Math.round((preDiscountAmount * discountPercent) / 100);
    const amountUninvoiced = preDiscountAmount - discountAmount;
    
    // 2. Average hours worked per week (last 4 weeks)
    const hoursResult = await query(
      `SELECT 
        COALESCE(SUM(te.minutes_spent), 0) as total_minutes
       FROM time_entries te
       WHERE te.client_id = $1 AND te.work_date >= $2`,
      [id, fourWeeksAgo.toISOString().split('T')[0]]
    );
    const totalMinutes = parseInt(hoursResult.rows[0].total_minutes) || 0;
    const averageHoursPerWeek = (totalMinutes / 60) / 4; // 4 weeks
    
    // 3. Total amount invoiced not paid
    // Get all invoices for this client
    const invoicesResult = await query(
      `SELECT id, total_cents, invoice_date
       FROM invoices
       WHERE client_id = $1`,
      [id]
    );
    
    // Get total payments applied to each invoice
    const paymentsResult = await query(
      `SELECT 
        pa.invoice_id,
        COALESCE(SUM(pa.amount_cents), 0) as paid_amount_cents
       FROM payment_applications pa
       JOIN invoices i ON pa.invoice_id = i.id
       WHERE i.client_id = $1
       GROUP BY pa.invoice_id`,
      [id]
    );
    
    const paidByInvoice = {};
    paymentsResult.rows.forEach(row => {
      paidByInvoice[row.invoice_id] = parseInt(row.paid_amount_cents) || 0;
    });
    
    let totalInvoicedNotPaid = 0;
    invoicesResult.rows.forEach(invoice => {
      const paid = paidByInvoice[invoice.id] || 0;
      const unpaid = invoice.total_cents - paid;
      if (unpaid > 0) {
        totalInvoicedNotPaid += unpaid;
      }
    });
    
    // 4. Amount invoiced in last 30, 60, 90 days, all time
    const invoicesByPeriodResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN invoice_date >= $1 THEN total_cents ELSE 0 END), 0) as last_30_days,
        COALESCE(SUM(CASE WHEN invoice_date >= $2 THEN total_cents ELSE 0 END), 0) as last_60_days,
        COALESCE(SUM(CASE WHEN invoice_date >= $3 THEN total_cents ELSE 0 END), 0) as last_90_days,
        COALESCE(SUM(total_cents), 0) as all_time
       FROM invoices
       WHERE client_id = $4`,
      [
        thirtyDaysAgo.toISOString().split('T')[0],
        sixtyDaysAgo.toISOString().split('T')[0],
        ninetyDaysAgo.toISOString().split('T')[0],
        id
      ]
    );
    
    const periodStats = invoicesByPeriodResult.rows[0];
    
    // 5. Amount invoiced unpaid (same as #3, but we'll return it separately for clarity)
    const amountInvoicedUnpaid = totalInvoicedNotPaid;
    
    res.json({
      amount_uninvoiced_cents: amountUninvoiced,
      average_hours_per_week: Math.round(averageHoursPerWeek * 100) / 100, // Round to 2 decimals
      total_invoiced_not_paid_cents: totalInvoicedNotPaid,
      invoiced_last_30_days_cents: parseInt(periodStats.last_30_days) || 0,
      invoiced_last_60_days_cents: parseInt(periodStats.last_60_days) || 0,
      invoiced_last_90_days_cents: parseInt(periodStats.last_90_days) || 0,
      invoiced_all_time_cents: parseInt(periodStats.all_time) || 0,
      amount_invoiced_unpaid_cents: amountInvoicedUnpaid
    });
  } catch (error) {
    next(error);
  }
});

export default router;

