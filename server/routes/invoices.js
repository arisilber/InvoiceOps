import express from 'express';
import { query, getClient } from '../db/connection.js';
import {
  createInvoiceFromTimeEntries,
  getNextInvoiceNumber,
  previewInvoiceFromTimeEntries,
  generateLineDescription
} from '../services/invoiceService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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

// GET next invoice number (must come before /:id route)
router.get('/next-invoice-number', async (req, res, next) => {
  try {
    const nextNumber = await getNextInvoiceNumber();
    res.json({ next_invoice_number: nextNumber });
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

    // Get invoice lines and calculate discount per line
    const linesResult = await query(
      `SELECT il.*, wt.code as work_type_code, wt.description as work_type_description
       FROM invoice_lines il
       JOIN work_types wt ON il.work_type_id = wt.id
       WHERE il.invoice_id = $1
       ORDER BY il.id`,
      [id]
    );

    // Get client discount_percent to calculate discount per line
    const clientResult = await query(
      'SELECT discount_percent FROM clients WHERE id = $1',
      [invoice.client_id]
    );
    const discount_percent = clientResult.rows[0]?.discount_percent || 0;

    // Calculate discount_cents for each line (amount_cents is already discounted)
    // We need to reverse-calculate: if amount_cents = pre_discount * (1 - discount_percent/100)
    // then pre_discount = amount_cents / (1 - discount_percent/100)
    // and discount_cents = pre_discount - amount_cents
    invoice.lines = linesResult.rows.map(line => {
      if (discount_percent > 0 && discount_percent < 100) {
        // Reverse calculate: discounted_amount = pre_discount * (1 - discount_percent/100)
        // So pre_discount = discounted_amount / (1 - discount_percent/100)
        const pre_discount_amount = line.amount_cents / (1 - discount_percent / 100);
        const discount_cents = Math.round(pre_discount_amount - line.amount_cents);
        return { ...line, discount_cents };
      } else if (discount_percent >= 100) {
        // If discount is 100%, the amount_cents should be 0, and discount equals the pre-discount amount
        // We can't reverse-calculate accurately, so we'll estimate based on hourly_rate
        const estimated_pre_discount = Math.round((line.total_minutes / 60) * line.hourly_rate_cents);
        const discount_cents = estimated_pre_discount;
        return { ...line, discount_cents };
      }
      return { ...line, discount_cents: 0 };
    });

    res.json(invoice);
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

// POST generate AI description for an invoice line
router.post('/generate-line-description', async (req, res, next) => {
  try {
    const { time_entries, work_type_description, project_name } = req.body;

    if (!time_entries || !Array.isArray(time_entries) || time_entries.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid time_entries array' });
    }

    if (!work_type_description) {
      return res.status(400).json({ error: 'Missing required field: work_type_description' });
    }

    const description = await generateLineDescription(
      time_entries,
      work_type_description,
      project_name || ''
    );
    
    res.json({ description });
  } catch (error) {
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

// PUT update invoice line description
router.put('/lines/:lineId/description', async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { description } = req.body;

    if (description === undefined) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await query(
      'UPDATE invoice_lines SET description = $1 WHERE id = $2 RETURNING *',
      [description || null, lineId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice line not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;

