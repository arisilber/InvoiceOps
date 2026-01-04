import { query, getClient } from '../db/connection.js';

/**
 * Creates an invoice from time entries for a specific client and date range.
 * 
 * Business Rules:
 * 1. User selects a client and a date range.
 * 2. All time_entries for that client in that date range should be aggregated into invoice_lines.
 * 3. Aggregation is by unique combination of work_type_id + project_name.
 * 4. Line amount = (total_minutes / 60) * client.hourly_rate_cents.
 * 5. Discount is applied at invoice level: discount_cents = subtotal_cents * client.discount_percent / 100.
 * 6. total_cents = subtotal_cents - discount_cents.
 * 7. Invoice number is sequential but may be assigned manually.
 * 8. Invoice status starts as 'draft'.
 * 9. Invoices are editable after creation.
 * 10. Projects are optional; project_name can be null or blank.
 * 
 * @param {number} clientId - The ID of the client
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} invoiceNumber - The invoice number (manually assigned)
 * @param {string} invoiceDate - Invoice date in YYYY-MM-DD format
 * @param {string} dueDate - Due date in YYYY-MM-DD format
 * @returns {Promise<Object>} The created invoice with lines
 */
export async function createInvoiceFromTimeEntries(
    clientId,
    startDate,
    endDate,
    invoiceNumber,
    invoiceDate,
    dueDate
) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Step 1: Validate client exists and get client details
        const clientResult = await client.query(
            'SELECT id, name, email, hourly_rate_cents, discount_percent FROM clients WHERE id = $1',
            [clientId]
        );

        if (clientResult.rows.length === 0) {
            throw new Error(`Client with ID ${clientId} not found`);
        }

        const clientData = clientResult.rows[0];
        const { hourly_rate_cents, discount_percent } = clientData;

        // Step 2: Fetch all uninvoiced time entries for the client in the date range
        const timeEntriesResult = await client.query(
            `SELECT id, work_type_id, project_name, minutes_spent
       FROM time_entries
       WHERE client_id = $1
         AND work_date >= $2
         AND work_date <= $3
         AND invoice_id IS NULL
       ORDER BY work_type_id, project_name`,
            [clientId, startDate, endDate]
        );

        if (timeEntriesResult.rows.length === 0) {
            throw new Error('No uninvoiced time entries found for the specified client and date range');
        }

        const timeEntries = timeEntriesResult.rows;

        // Step 3: Aggregate time entries by work_type_id + project_name
        const aggregatedLines = {};

        for (const entry of timeEntries) {
            // Handle null or empty project names - normalize to empty string
            const projectName = entry.project_name || '';
            const key = `${entry.work_type_id}|${projectName}`;

            if (!aggregatedLines[key]) {
                aggregatedLines[key] = {
                    work_type_id: entry.work_type_id,
                    project_name: projectName,
                    total_minutes: 0,
                    time_entry_ids: []
                };
            }

            aggregatedLines[key].total_minutes += entry.minutes_spent;
            aggregatedLines[key].time_entry_ids.push(entry.id);
        }

        // Step 4: Calculate line amounts and prepare invoice lines
        const invoiceLines = [];
        let subtotal_cents = 0;

        for (const key in aggregatedLines) {
            const line = aggregatedLines[key];

            // Calculate amount: (total_minutes / 60) * hourly_rate_cents
            const amount_cents = Math.round((line.total_minutes / 60) * hourly_rate_cents);

            invoiceLines.push({
                work_type_id: line.work_type_id,
                project_name: line.project_name,
                total_minutes: line.total_minutes,
                hourly_rate_cents: hourly_rate_cents,
                amount_cents: amount_cents,
                time_entry_ids: line.time_entry_ids
            });

            subtotal_cents += amount_cents;
        }

        // Step 5: Calculate discount and total
        const discount_cents = Math.round((subtotal_cents * discount_percent) / 100);
        const total_cents = subtotal_cents - discount_cents;

        // Step 6: Create the invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (
        invoice_number, 
        client_id, 
        invoice_date, 
        due_date, 
        status, 
        subtotal_cents, 
        discount_cents, 
        total_cents
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                invoiceNumber,
                clientId,
                invoiceDate,
                dueDate,
                'draft',
                subtotal_cents,
                discount_cents,
                total_cents
            ]
        );

        const invoice = invoiceResult.rows[0];

        // Step 7: Insert invoice lines
        for (const line of invoiceLines) {
            await client.query(
                `INSERT INTO invoice_lines (
          invoice_id, 
          work_type_id, 
          project_name, 
          total_minutes, 
          hourly_rate_cents, 
          amount_cents
        )
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

            // Step 8: Update time entries to link them to this invoice
            for (const timeEntryId of line.time_entry_ids) {
                await client.query(
                    'UPDATE time_entries SET invoice_id = $1 WHERE id = $2',
                    [invoice.id, timeEntryId]
                );
            }
        }

        await client.query('COMMIT');

        // Step 9: Fetch the complete invoice with lines and client info
        const completeInvoiceResult = await query(
            `SELECT i.*, c.name as client_name, c.email as client_email, c.type as client_type
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
            [invoice.id]
        );

        const linesResult = await query(
            `SELECT il.*, wt.code as work_type_code, wt.description as work_type_description
       FROM invoice_lines il
       JOIN work_types wt ON il.work_type_id = wt.id
       WHERE il.invoice_id = $1
       ORDER BY il.id`,
            [invoice.id]
        );

        const completeInvoice = completeInvoiceResult.rows[0];
        completeInvoice.lines = linesResult.rows;

        return completeInvoice;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get the next available invoice number
 * @returns {Promise<number>} The next sequential invoice number
 */
export async function getNextInvoiceNumber() {
    const result = await query(
        'SELECT COALESCE(MAX(invoice_number), 0) + 1 as next_number FROM invoices'
    );
    return result.rows[0].next_number;
}

/**
 * Get preview of time entries that would be included in an invoice
 * @param {number} clientId - The ID of the client
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Preview data including aggregated lines and totals
 */
export async function previewInvoiceFromTimeEntries(clientId, startDate, endDate) {
    // Get client details
    const clientResult = await query(
        'SELECT id, name, email, hourly_rate_cents, discount_percent FROM clients WHERE id = $1',
        [clientId]
    );

    if (clientResult.rows.length === 0) {
        throw new Error(`Client with ID ${clientId} not found`);
    }

    const clientData = clientResult.rows[0];
    const { hourly_rate_cents, discount_percent } = clientData;

    // Fetch uninvoiced time entries
    const timeEntriesResult = await query(
        `SELECT te.*, wt.code as work_type_code, wt.description as work_type_description
     FROM time_entries te
     JOIN work_types wt ON te.work_type_id = wt.id
     WHERE te.client_id = $1
       AND te.work_date >= $2
       AND te.work_date <= $3
       AND te.invoice_id IS NULL
     ORDER BY te.work_type_id, te.project_name`,
        [clientId, startDate, endDate]
    );

    const timeEntries = timeEntriesResult.rows;

    // Aggregate by work_type_id + project_name
    const aggregatedLines = {};

    for (const entry of timeEntries) {
        const projectName = entry.project_name || '';
        const key = `${entry.work_type_id}|${projectName}`;

        if (!aggregatedLines[key]) {
            aggregatedLines[key] = {
                work_type_id: entry.work_type_id,
                work_type_code: entry.work_type_code,
                work_type_description: entry.work_type_description,
                project_name: projectName,
                total_minutes: 0,
                entry_count: 0
            };
        }

        aggregatedLines[key].total_minutes += entry.minutes_spent;
        aggregatedLines[key].entry_count += 1;
    }

    // Calculate amounts
    const lines = [];
    let subtotal_cents = 0;

    for (const key in aggregatedLines) {
        const line = aggregatedLines[key];
        const amount_cents = Math.round((line.total_minutes / 60) * hourly_rate_cents);

        lines.push({
            work_type_id: line.work_type_id,
            work_type_code: line.work_type_code,
            work_type_description: line.work_type_description,
            project_name: line.project_name,
            total_minutes: line.total_minutes,
            hourly_rate_cents: hourly_rate_cents,
            amount_cents: amount_cents,
            entry_count: line.entry_count
        });

        subtotal_cents += amount_cents;
    }

    const discount_cents = Math.round((subtotal_cents * discount_percent) / 100);
    const total_cents = subtotal_cents - discount_cents;

    return {
        client: clientData,
        lines,
        subtotal_cents,
        discount_cents,
        total_cents,
        total_entries: timeEntries.length,
        date_range: { start: startDate, end: endDate }
    };
}
