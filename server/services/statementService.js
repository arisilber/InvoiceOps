import { query } from '../db/connection.js';

/**
 * Normalize a date-ish value (pg DATE may come back as a JS Date in some envs)
 * into a stable YYYY-MM-DD string for statement rendering.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string|null}
 */
function normalizeDateToYMD(value) {
  if (!value) return null;

  // If pg returns a JS Date, JSON serialization would otherwise become an ISO timestamp.
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    // Handles both "YYYY-MM-DD" and ISO timestamps like "YYYY-MM-DDTHH:mm:ss.sssZ"
    const ymdMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (ymdMatch) return ymdMatch[0];

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Calculates the beginning AR balance for a client prior to the statement period.
 * Formula: Sum of invoices - Sum of payments (before start_date)
 * Excludes voided invoices.
 * 
 * @param {number} clientId - The ID of the client
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @returns {Promise<number>} Beginning balance in cents (integer)
 */
export async function calculateBeginningBalance(clientId, startDate) {
  // Calculate beginning balance: Sum of invoices before start_date minus payments before start_date
  // We need to handle this carefully to avoid double-counting payments
  
  // First, get sum of all invoices dated before start_date
  const invoicesResult = await query(
    `SELECT COALESCE(SUM(total_cents), 0) as total_invoices_cents
    FROM invoices
    WHERE client_id = $1
      AND status != 'voided'
      AND invoice_date < $2`,
    [clientId, startDate]
  );

  // Then, get sum of all payments dated before start_date for this client's invoices
  const paymentsResult = await query(
    `SELECT COALESCE(SUM(pa.amount_cents), 0) as total_payments_cents
    FROM payment_applications pa
    JOIN payments p ON pa.payment_id = p.id
    JOIN invoices i ON pa.invoice_id = i.id
    WHERE i.client_id = $1
      AND i.status != 'voided'
      AND p.payment_date < $2`,
    [clientId, startDate]
  );

  const total_invoices_cents = parseInt(invoicesResult.rows[0].total_invoices_cents, 10) || 0;
  const total_payments_cents = parseInt(paymentsResult.rows[0].total_payments_cents, 10) || 0;

  return total_invoices_cents - total_payments_cents;
}

/**
 * Fetches all transactions (invoices and payment applications) for a client within a date range.
 * Returns combined array ordered by date, then by type (invoices before payments), 
 * then by invoice_number/payment_id.
 * 
 * @param {number} clientId - The ID of the client
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of transaction objects (invoices and payment applications)
 */
export async function fetchStatementData(clientId, startDate, endDate) {
  // Fetch invoices in period
  const invoicesResult = await query(
    `SELECT 
      i.id as invoice_id,
      i.invoice_number,
      i.invoice_date,
      i.total_cents,
      i.status,
      c.name as client_name
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.client_id = $1
      AND i.invoice_date >= $2
      AND i.invoice_date <= $3
      AND i.status != 'voided'
    ORDER BY i.invoice_date, i.invoice_number`,
    [clientId, startDate, endDate]
  );

  // Fetch payment applications in period
  const paymentsResult = await query(
    `SELECT 
      pa.id as application_id,
      pa.payment_id,
      pa.invoice_id,
      pa.amount_cents,
      p.payment_date,
      p.note as payment_note,
      i.invoice_number,
      i.client_id
    FROM payment_applications pa
    JOIN payments p ON pa.payment_id = p.id
    JOIN invoices i ON pa.invoice_id = i.id
    WHERE i.client_id = $1
      AND p.payment_date >= $2
      AND p.payment_date <= $3
    ORDER BY p.payment_date, pa.id`,
    [clientId, startDate, endDate]
  );

  // Combine and format transactions
  const transactions = [];

  // Add invoices
  invoicesResult.rows.forEach(invoice => {
    transactions.push({
      type: 'invoice',
      invoice_id: invoice.invoice_id,
      invoice_number: invoice.invoice_number,
      date: normalizeDateToYMD(invoice.invoice_date),
      amount_cents: invoice.total_cents,
      status: invoice.status,
      client_name: invoice.client_name
    });
  });

  // Add payment applications
  paymentsResult.rows.forEach(payment => {
    transactions.push({
      type: 'payment',
      payment_id: payment.payment_id,
      invoice_id: payment.invoice_id,
      invoice_number: payment.invoice_number,
      date: normalizeDateToYMD(payment.payment_date),
      amount_cents: -payment.amount_cents, // Negative for payments
      payment_note: payment.payment_note,
      application_id: payment.application_id
    });
  });

  // Sort transactions: date ASC → type (invoice before payment) → invoice_number/payment_id ASC
  transactions.sort((a, b) => {
    // First by date
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    
    // Then by type (invoices before payments)
    if (a.type === 'invoice' && b.type === 'payment') return -1;
    if (a.type === 'payment' && b.type === 'invoice') return 1;
    
    // Then by invoice_number or payment_id
    if (a.type === 'invoice' && b.type === 'invoice') {
      return a.invoice_number - b.invoice_number;
    }
    if (a.type === 'payment' && b.type === 'payment') {
      return a.payment_id - b.payment_id;
    }
    
    return 0;
  });

  return transactions;
}

/**
 * Fetches company settings from system_settings table.
 * 
 * @returns {Promise<Object>} Object with company_name, company_address, company_email
 */
async function fetchCompanySettings() {
  const settings = {
    company_name: null,
    company_address: null,
    company_email: null
  };

  try {
    const result = await query(
      "SELECT key, value FROM system_settings WHERE key IN ('company_name', 'company_address', 'company_email')"
    );
    
    result.rows.forEach(row => {
      if (row.key === 'company_name') {
        settings.company_name = row.value;
      } else if (row.key === 'company_address') {
        settings.company_address = row.value;
      } else if (row.key === 'company_email') {
        settings.company_email = row.value;
      }
    });
  } catch (error) {
    // If system_settings table doesn't exist yet, ignore the error
    if (error.code !== '42P01') {
      console.error('Error fetching company settings:', error);
    }
  }

  return settings;
}

/**
 * Main function that orchestrates the statement calculation.
 * Validates inputs, fetches data, calculates balances, and returns complete statement object.
 * 
 * @param {number} clientId - The ID of the client
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Complete statement object with transactions and totals
 */
export async function calculateStatement(clientId, startDate, endDate) {
  // Validate dates
  if (!startDate || !endDate) {
    throw new Error('start_date and end_date are required');
  }

  if (startDate > endDate) {
    throw new Error('start_date must be less than or equal to end_date');
  }

  // Validate date format (basic check)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error('Dates must be in YYYY-MM-DD format');
  }

  // Validate client exists
  const clientResult = await query(
    'SELECT id, name, email FROM clients WHERE id = $1',
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    throw new Error(`Client with ID ${clientId} not found`);
  }

  const client = clientResult.rows[0];

  // Calculate beginning balance
  const beginning_balance_cents = await calculateBeginningBalance(clientId, startDate);

  // Fetch transactions for the period
  const rawTransactions = await fetchStatementData(clientId, startDate, endDate);

  // Calculate period totals
  let period_invoices_total_cents = 0;
  let period_payments_total_cents = 0;

  rawTransactions.forEach(transaction => {
    if (transaction.type === 'invoice') {
      period_invoices_total_cents += transaction.amount_cents;
    } else if (transaction.type === 'payment') {
      period_payments_total_cents += Math.abs(transaction.amount_cents); // Already negative
    }
  });

  // Calculate running balance and format transactions
  let running_balance_cents = beginning_balance_cents;
  const transactions = rawTransactions.map(transaction => {
    running_balance_cents += transaction.amount_cents;

    const formattedTransaction = {
      type: transaction.type,
      date: transaction.date,
      document_number: transaction.type === 'invoice' 
        ? `INV-${transaction.invoice_number}` 
        : `PAY-${transaction.payment_id}`,
      description: transaction.type === 'invoice'
        ? `Invoice ${transaction.invoice_number}`
        : `Payment on Invoice ${transaction.invoice_number}${transaction.payment_note ? ` - ${transaction.payment_note}` : ''}`,
      amount_cents: transaction.amount_cents,
      running_balance_cents: running_balance_cents,
      invoice_id: transaction.invoice_id,
      invoice_number: transaction.invoice_number
    };

    if (transaction.type === 'payment') {
      formattedTransaction.payment_id = transaction.payment_id;
      formattedTransaction.payment_note = transaction.payment_note;
    }

    return formattedTransaction;
  });

  // Calculate ending balance
  const ending_balance_cents = running_balance_cents;

  // Fetch company settings
  const companySettings = await fetchCompanySettings();

  // Build and return statement object
  return {
    client_id: client.id,
    client_name: client.name,
    client_email: client.email,
    start_date: startDate,
    end_date: endDate,
    beginning_balance_cents,
    ending_balance_cents,
    period_invoices_total_cents,
    period_payments_total_cents,
    transactions,
    company_name: companySettings.company_name || '',
    company_address: companySettings.company_address || '',
    company_email: companySettings.company_email || ''
  };
}
