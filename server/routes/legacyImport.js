import express from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Import legacy invoices with their line items
 * 
 * Expected format:
 * {
 *   invoices: [
 *     {
 *       invoice_number: number,
 *       client_name: string,  // Will be matched to existing client
 *       invoice_date: string (YYYY-MM-DD),
 *       due_date: string (YYYY-MM-DD),
 *       status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'voided',
 *       subtotal_cents: number,
 *       discount_cents: number,
 *       total_cents: number,
 *       lines: [
 *         {
 *           work_type_code: string,  // Will be matched to existing work type
 *           project_name: string,
 *           total_minutes: number,
 *           hourly_rate_cents: number,
 *           amount_cents: number,
 *           description: string (optional)
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/invoices', async (req, res, next) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { invoices } = req.body;
    
    if (!Array.isArray(invoices) || invoices.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Expected an array of invoices' });
    }
    
    const results = [];
    const errors = [];
    
    // Get all clients and work types for matching
    const clientsResult = await client.query('SELECT id, name FROM clients');
    const clientsMap = new Map();
    clientsResult.rows.forEach(c => {
      clientsMap.set(c.name.toLowerCase(), c.id);
    });
    
    const workTypesResult = await client.query('SELECT id, code FROM work_types');
    const workTypesMap = new Map();
    workTypesResult.rows.forEach(wt => {
      workTypesMap.set(wt.code.toLowerCase(), wt.id);
    });
    
    for (let i = 0; i < invoices.length; i++) {
      const invoiceData = invoices[i];
      
      try {
        // Validate required fields
        if (!invoiceData.invoice_number || !invoiceData.client_name || 
            !invoiceData.invoice_date || !invoiceData.due_date) {
          errors.push({
            index: i,
            error: 'Missing required fields: invoice_number, client_name, invoice_date, due_date',
            invoice: invoiceData
          });
          continue;
        }
        
        // Find client
        const clientId = clientsMap.get(invoiceData.client_name.toLowerCase());
        if (!clientId) {
          errors.push({
            index: i,
            error: `Client "${invoiceData.client_name}" not found`,
            invoice: invoiceData
          });
          continue;
        }
        
        // Check if invoice number already exists
        const existingInvoice = await client.query(
          'SELECT id FROM invoices WHERE invoice_number = $1',
          [invoiceData.invoice_number]
        );
        
        if (existingInvoice.rows.length > 0) {
          errors.push({
            index: i,
            error: `Invoice number ${invoiceData.invoice_number} already exists`,
            invoice: invoiceData
          });
          continue;
        }
        
        // Insert invoice
        const invoiceResult = await client.query(
          `INSERT INTO invoices (
            invoice_number, client_id, invoice_date, due_date, status,
            subtotal_cents, discount_cents, total_cents
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            invoiceData.invoice_number,
            clientId,
            invoiceData.invoice_date,
            invoiceData.due_date,
            invoiceData.status || 'draft',
            invoiceData.subtotal_cents || 0,
            invoiceData.discount_cents || 0,
            invoiceData.total_cents || 0
          ]
        );
        
        const invoice = invoiceResult.rows[0];
        
        // Insert invoice lines and create time entries
        if (invoiceData.lines && Array.isArray(invoiceData.lines)) {
          for (const line of invoiceData.lines) {
            // Find work type
            const workTypeId = workTypesMap.get(line.work_type_code?.toLowerCase());
            if (!workTypeId) {
              errors.push({
                index: i,
                error: `Work type "${line.work_type_code}" not found for invoice ${invoiceData.invoice_number}`,
                invoice: invoiceData,
                line: line
              });
              continue;
            }
            
            await client.query(
              `INSERT INTO invoice_lines (
                invoice_id, work_type_id, project_name, total_minutes,
                hourly_rate_cents, amount_cents, description
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                invoice.id,
                workTypeId,
                line.project_name || '',
                line.total_minutes || 0,
                line.hourly_rate_cents || 0,
                line.amount_cents || 0,
                line.description || null
              ]
            );
            
            // Create time entries from invoice line if total_minutes is provided
            // This links the hours to the invoice so they don't show as "uninvoiced"
            if (line.total_minutes && line.total_minutes > 0) {
              // Use invoice_date as the work_date, or use a provided work_date from the line
              const workDate = line.work_date || invoiceData.invoice_date;
              
              // Split total_minutes into one or more time entries
              // If the line has time_entries array, use those; otherwise create a single entry
              if (line.time_entries && Array.isArray(line.time_entries) && line.time_entries.length > 0) {
                // Use provided time entries
                for (const timeEntry of line.time_entries) {
                  await client.query(
                    `INSERT INTO time_entries (
                      client_id, work_type_id, project_name, work_date,
                      minutes_spent, detail, invoice_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                      clientId,
                      workTypeId,
                      timeEntry.project_name || line.project_name || '',
                      timeEntry.work_date || workDate,
                      timeEntry.minutes_spent || Math.round(line.total_minutes / line.time_entries.length),
                      timeEntry.detail || line.description || null,
                      invoice.id
                    ]
                  );
                }
              } else {
                // Create a single time entry for the entire line
                await client.query(
                  `INSERT INTO time_entries (
                    client_id, work_type_id, project_name, work_date,
                    minutes_spent, detail, invoice_id
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    clientId,
                    workTypeId,
                    line.project_name || '',
                    workDate,
                    line.total_minutes,
                    line.description || null,
                    invoice.id
                  ]
                );
              }
            }
          }
        }
        
        results.push({
          invoice_number: invoice.invoice_number,
          id: invoice.id
        });
        
      } catch (err) {
        errors.push({
          index: i,
          error: err.message,
          invoice: invoiceData
        });
      }
    }
    
    if (errors.length > 0 && results.length === 0) {
      // All failed
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'All invoices failed to import',
        errors: errors
      });
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success_count: results.length,
      error_count: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Import legacy payments with their applications to invoices
 * 
 * Expected format:
 * {
 *   payments: [
 *     {
 *       payment_date: string (YYYY-MM-DD),
 *       amount_cents: number,
 *       note: string (optional),
 *       applications: [
 *         {
 *           invoice_number: number,  // Will be matched to existing invoice
 *           amount_cents: number
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/payments', async (req, res, next) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { payments } = req.body;
    
    if (!Array.isArray(payments) || payments.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Expected an array of payments' });
    }
    
    const results = [];
    const errors = [];
    
    // Get all invoices for matching
    const invoicesResult = await client.query('SELECT id, invoice_number FROM invoices');
    const invoicesMap = new Map();
    invoicesResult.rows.forEach(inv => {
      invoicesMap.set(inv.invoice_number, inv.id);
    });
    
    for (let i = 0; i < payments.length; i++) {
      const paymentData = payments[i];
      
      try {
        // Validate required fields
        if (!paymentData.payment_date || !paymentData.amount_cents) {
          errors.push({
            index: i,
            error: 'Missing required fields: payment_date, amount_cents',
            payment: paymentData
          });
          continue;
        }
        
        // Insert payment
        const paymentResult = await client.query(
          `INSERT INTO payments (payment_date, amount_cents, note)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [
            paymentData.payment_date,
            paymentData.amount_cents,
            paymentData.note || null
          ]
        );
        
        const payment = paymentResult.rows[0];
        
        // Insert payment applications
        if (paymentData.applications && Array.isArray(paymentData.applications)) {
          for (const app of paymentData.applications) {
            // Find invoice
            const invoiceId = invoicesMap.get(app.invoice_number);
            if (!invoiceId) {
              errors.push({
                index: i,
                error: `Invoice number ${app.invoice_number} not found for payment`,
                payment: paymentData,
                application: app
              });
              continue;
            }
            
            await client.query(
              `INSERT INTO payment_applications (payment_id, invoice_id, amount_cents)
               VALUES ($1, $2, $3)`,
              [payment.id, invoiceId, app.amount_cents]
            );
          }
        }
        
        results.push({
          id: payment.id,
          payment_date: payment.payment_date,
          amount_cents: payment.amount_cents
        });
        
      } catch (err) {
        errors.push({
          index: i,
          error: err.message,
          payment: paymentData
        });
      }
    }
    
    if (errors.length > 0 && results.length === 0) {
      // All failed
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'All payments failed to import',
        errors: errors
      });
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success_count: results.length,
      error_count: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Import legacy time entries
 * 
 * Expected format:
 * {
 *   time_entries: [
 *     {
 *       client_name: string,  // Will be matched to existing client
 *       work_type_code: string,  // Will be matched to existing work type
 *       project_name: string (optional),
 *       work_date: string (YYYY-MM-DD),
 *       minutes_spent: number,
 *       detail: string (optional),
 *       invoice_number: number (optional)  // Will link to existing invoice if provided
 *     }
 *   ]
 * }
 */
router.post('/time-entries', async (req, res, next) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { time_entries } = req.body;
    
    if (!Array.isArray(time_entries) || time_entries.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Expected an array of time_entries' });
    }
    
    const results = [];
    const errors = [];
    
    // Get all clients, work types, and invoices for matching
    const clientsResult = await client.query('SELECT id, name FROM clients');
    const clientsMap = new Map();
    clientsResult.rows.forEach(c => {
      clientsMap.set(c.name.toLowerCase(), c.id);
    });
    
    const workTypesResult = await client.query('SELECT id, code FROM work_types');
    const workTypesMap = new Map();
    workTypesResult.rows.forEach(wt => {
      workTypesMap.set(wt.code.toLowerCase(), wt.id);
    });
    
    const invoicesResult = await client.query('SELECT id, invoice_number FROM invoices');
    const invoicesMap = new Map();
    invoicesResult.rows.forEach(inv => {
      invoicesMap.set(inv.invoice_number, inv.id);
    });
    
    for (let i = 0; i < time_entries.length; i++) {
      const entryData = time_entries[i];
      
      try {
        // Validate required fields
        if (!entryData.client_name || !entryData.work_type_code || 
            !entryData.work_date || !entryData.minutes_spent) {
          errors.push({
            index: i,
            error: 'Missing required fields: client_name, work_type_code, work_date, minutes_spent',
            entry: entryData
          });
          continue;
        }
        
        // Find client
        const clientId = clientsMap.get(entryData.client_name.toLowerCase());
        if (!clientId) {
          errors.push({
            index: i,
            error: `Client "${entryData.client_name}" not found`,
            entry: entryData
          });
          continue;
        }
        
        // Find work type
        const workTypeId = workTypesMap.get(entryData.work_type_code?.toLowerCase());
        if (!workTypeId) {
          errors.push({
            index: i,
            error: `Work type "${entryData.work_type_code}" not found`,
            entry: entryData
          });
          continue;
        }
        
        // Find invoice if invoice_number provided
        let invoiceId = null;
        if (entryData.invoice_number) {
          invoiceId = invoicesMap.get(entryData.invoice_number);
          if (!invoiceId) {
            errors.push({
              index: i,
              error: `Invoice number ${entryData.invoice_number} not found`,
              entry: entryData
            });
            continue;
          }
        }
        
        // Validate minutes_spent
        const minutesSpent = parseInt(entryData.minutes_spent);
        if (isNaN(minutesSpent) || minutesSpent <= 0) {
          errors.push({
            index: i,
            error: 'minutes_spent must be a positive number',
            entry: entryData
          });
          continue;
        }
        
        // Insert time entry
        const entryResult = await client.query(
          `INSERT INTO time_entries (
            client_id, work_type_id, project_name, work_date, 
            minutes_spent, detail, invoice_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            clientId,
            workTypeId,
            entryData.project_name || '',
            entryData.work_date,
            minutesSpent,
            entryData.detail || null,
            invoiceId
          ]
        );
        
        results.push({
          id: entryResult.rows[0].id,
          work_date: entryResult.rows[0].work_date,
          minutes_spent: entryResult.rows[0].minutes_spent
        });
        
      } catch (err) {
        errors.push({
          index: i,
          error: err.message,
          entry: entryData
        });
      }
    }
    
    if (errors.length > 0 && results.length === 0) {
      // All failed
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'All time entries failed to import',
        errors: errors
      });
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success_count: results.length,
      error_count: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
