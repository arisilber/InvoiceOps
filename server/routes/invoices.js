import express from 'express';
import { query, getClient } from '../db/connection.js';
import {
  createInvoiceFromTimeEntries,
  getNextInvoiceNumber,
  previewInvoiceFromTimeEntries
} from '../services/invoiceService.js';

const router = express.Router();

// GET all invoices
router.get('/', async (req, res, next) => {
  try {
    const { client_id, status } = req.query;
    let queryText = `
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (client_id) {
      queryText += ` AND i.client_id = $${paramCount}`;
      params.push(client_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND i.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ' ORDER BY i.invoice_date DESC, i.created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET invoice by ID with lines
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get invoice
    const invoiceResult = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.type as client_type
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get invoice lines
    const linesResult = await query(
      `SELECT il.*, wt.code as work_type_code, wt.description as work_type_description
       FROM invoice_lines il
       JOIN work_types wt ON il.work_type_id = wt.id
       WHERE il.invoice_id = $1
       ORDER BY il.id`,
      [id]
    );

    invoice.lines = linesResult.rows;

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// GET next invoice number
router.get('/next-invoice-number', async (req, res, next) => {
  try {
    const nextNumber = await getNextInvoiceNumber();
    res.json({ next_invoice_number: nextNumber });
  } catch (error) {
    next(error);
  }
});

// POST preview invoice from time entries
router.post('/preview-from-time-entries', async (req, res, next) => {
  try {
    const { client_id, start_date, end_date } = req.body;

    if (!client_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields: client_id, start_date, end_date' });
    }

    const preview = await previewInvoiceFromTimeEntries(client_id, start_date, end_date);
    res.json(preview);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No uninvoiced')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// POST create invoice from time entries
router.post('/from-time-entries', async (req, res, next) => {
  try {
    const {
      client_id,
      start_date,
      end_date,
      invoice_number,
      invoice_date,
      due_date
    } = req.body;

    if (!client_id || !start_date || !end_date || !invoice_number || !invoice_date || !due_date) {
      return res.status(400).json({
        error: 'Missing required fields: client_id, start_date, end_date, invoice_number, invoice_date, due_date'
      });
    }

    const invoice = await createInvoiceFromTimeEntries(
      client_id,
      start_date,
      end_date,
      invoice_number,
      invoice_date,
      due_date
    );

    res.status(201).json(invoice);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No uninvoiced')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Invoice number already exists' });
    }
    next(error);
  }
});

// POST create new invoice
router.post('/', async (req, res, next) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const {
      invoice_number,
      client_id,
      invoice_date,
      due_date,
      status,
      subtotal_cents,
      discount_cents,
      total_cents,
      lines
    } = req.body;

    if (!invoice_number || !client_id || !invoice_date || !due_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert invoice
    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, status, subtotal_cents, discount_cents, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        invoice_number,
        client_id,
        invoice_date,
        due_date,
        status || 'draft',
        subtotal_cents || 0,
        discount_cents || 0,
        total_cents || 0
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Insert invoice lines
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO invoice_lines (invoice_id, work_type_id, project_name, total_minutes, hourly_rate_cents, amount_cents)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoice.id,
            line.work_type_id,
            line.project_name,
            line.total_minutes,
            line.hourly_rate_cents,
            line.amount_cents
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete invoice with lines
    const completeInvoice = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [invoice.id]
    );

    const invoiceLines = await query(
      `SELECT il.*, wt.code as work_type_code, wt.description as work_type_description
       FROM invoice_lines il
       JOIN work_types wt ON il.work_type_id = wt.id
       WHERE il.invoice_id = $1
       ORDER BY il.id`,
      [invoice.id]
    );

    const result = completeInvoice.rows[0];
    result.lines = invoiceLines.rows;

    res.status(201).json(result);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Invoice number already exists' });
    }
    next(error);
  } finally {
    client.release();
  }
});

// PUT update invoice
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      invoice_date,
      due_date,
      status,
      subtotal_cents,
      discount_cents,
      total_cents
    } = req.body;

    const result = await query(
      `UPDATE invoices
       SET invoice_date = $1, due_date = $2, status = $3, subtotal_cents = $4, discount_cents = $5, total_cents = $6
       WHERE id = $7
       RETURNING *`,
      [invoice_date, due_date, status, subtotal_cents, discount_cents, total_cents, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE invoice
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully', invoice: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

