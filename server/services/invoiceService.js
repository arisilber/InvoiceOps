import { query, getClient } from '../db/connection.js';

/**
 * Compile time entry descriptions into a single description string
 * @param {Array} timeEntries - Array of time entry objects with detail field
 * @returns {string} Compiled description from all time entry details
 */
function compileTimeEntryDescriptions(timeEntries) {
    const descriptions = timeEntries
        .map(entry => entry.detail)
        .filter(detail => detail && detail.trim())
        .map(detail => detail.trim())
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    if (descriptions.length === 0) {
        return '';
    }
    
    return descriptions.join('\n');
}

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

        // Step 2: Fetch all uninvoiced time entries for the client in the date range (including detail for AI)
        const timeEntriesResult = await client.query(
            `SELECT te.id, te.work_type_id, te.project_name, te.minutes_spent, te.work_date, te.detail,
                    wt.description as work_type_description
       FROM time_entries te
       JOIN work_types wt ON te.work_type_id = wt.id
       WHERE te.client_id = $1
         AND te.work_date >= $2
         AND te.work_date <= $3
         AND te.invoice_id IS NULL
       ORDER BY te.work_type_id, te.project_name`,
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
                    work_type_description: entry.work_type_description,
                    project_name: projectName,
                    total_minutes: 0,
                    time_entry_ids: [],
                    time_entries: [] // Store full entries for description compilation
                };
            }

            aggregatedLines[key].total_minutes += entry.minutes_spent;
            aggregatedLines[key].time_entry_ids.push(entry.id);
            aggregatedLines[key].time_entries.push(entry); // Store full entry
        }

        // Step 4: Calculate line amounts with discount per line and prepare invoice lines
        const invoiceLines = [];
        let total_cents = 0;

        for (const key in aggregatedLines) {
            const line = aggregatedLines[key];

            // Calculate pre-discount amount: (total_minutes / 60) * hourly_rate_cents
            const pre_discount_amount_cents = Math.round((line.total_minutes / 60) * hourly_rate_cents);
            
            // Calculate discount per line
            const line_discount_cents = Math.round((pre_discount_amount_cents * discount_percent) / 100);
            
            // Calculate discounted amount (this is what we store)
            const amount_cents = pre_discount_amount_cents - line_discount_cents;

            // Compile description from time entry details
            const description = compileTimeEntryDescriptions(line.time_entries);

            invoiceLines.push({
                work_type_id: line.work_type_id,
                project_name: line.project_name,
                total_minutes: line.total_minutes,
                hourly_rate_cents: hourly_rate_cents,
                amount_cents: amount_cents,
                discount_cents: line_discount_cents,
                time_entry_ids: line.time_entry_ids,
                description: description
            });

            total_cents += amount_cents;
        }

        // Step 5: Calculate totals (discount already applied per line)
        const subtotal_cents = invoiceLines.reduce((sum, line) => sum + line.amount_cents + line.discount_cents, 0);
        const discount_cents = invoiceLines.reduce((sum, line) => sum + line.discount_cents, 0);

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

        // Step 7: Insert invoice lines (amount_cents already contains discounted amount)
        for (const line of invoiceLines) {
            await client.query(
                `INSERT INTO invoice_lines (
          invoice_id, 
          work_type_id, 
          project_name, 
          total_minutes, 
          hourly_rate_cents, 
          amount_cents,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    invoice.id,
                    line.work_type_id,
                    line.project_name,
                    line.total_minutes,
                    line.hourly_rate_cents,
                    line.amount_cents,  // This is the discounted amount
                    line.description || null
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
 * Get the next available invoice number in MMDDYYYYxx format
 * @param {string} invoiceDate - Invoice date in YYYY-MM-DD format
 * @returns {Promise<number>} A unique invoice number in MMDDYYYYxx format
 */
export async function getNextInvoiceNumber(invoiceDate) {
    if (!invoiceDate) {
        // Fallback to current date if no date provided
        invoiceDate = new Date().toISOString().split('T')[0];
    }

    // Parse the date string directly to avoid timezone issues
    // invoiceDate is in YYYY-MM-DD format
    const [year, month, day] = invoiceDate.split('-').map(Number);
    
    // Format with leading zeros
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    
    // Generate base string: MMDDYYYY
    const baseString = `${monthStr}${dayStr}${year}`;
    
    // Try up to 100 times to find a unique number
    for (let attempt = 0; attempt < 100; attempt++) {
        // Generate random 2-digit suffix (00-99)
        const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        // Combine: MMDDYYYYxx (parse as integer to store in database)
        const invoiceNumber = parseInt(`${baseString}${randomSuffix}`);
        
        // Check if this number already exists
        const result = await query(
            'SELECT id FROM invoices WHERE invoice_number = $1',
            [invoiceNumber]
        );
        
        if (result.rows.length === 0) {
            // Number is unique, return it
            return invoiceNumber;
        }
    }
    
    // If we couldn't find a unique number after 100 attempts, throw an error
    throw new Error('Unable to generate unique invoice number after multiple attempts');
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
                entry_count: 0,
                time_entries: [] // Store full entries for AI description
            };
        }

        aggregatedLines[key].total_minutes += entry.minutes_spent;
        aggregatedLines[key].entry_count += 1;
        aggregatedLines[key].time_entries.push(entry); // Store full entry
    }

    // Calculate amounts with discount per line
    const lines = [];
    let total_cents = 0;

    for (const key in aggregatedLines) {
        const line = aggregatedLines[key];
        // Calculate pre-discount amount
        const pre_discount_amount_cents = Math.round((line.total_minutes / 60) * hourly_rate_cents);
        
        // Calculate discount per line
        const line_discount_cents = Math.round((pre_discount_amount_cents * discount_percent) / 100);
        
        // Calculate discounted amount (this is what we display)
        const amount_cents = pre_discount_amount_cents - line_discount_cents;

        // Compile description from time entry details
        const description = compileTimeEntryDescriptions(line.time_entries);

        lines.push({
            work_type_id: line.work_type_id,
            work_type_code: line.work_type_code,
            work_type_description: line.work_type_description,
            project_name: line.project_name,
            total_minutes: line.total_minutes,
            hourly_rate_cents: hourly_rate_cents,
            amount_cents: amount_cents,  // Discounted amount
            discount_cents: line_discount_cents,
            entry_count: line.entry_count,
            description: description
        });

        total_cents += amount_cents;
    }

    // Calculate totals for display (discount already applied per line)
    const subtotal_cents = lines.reduce((sum, line) => sum + line.amount_cents + line.discount_cents, 0);
    const discount_cents = lines.reduce((sum, line) => sum + line.discount_cents, 0);

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

/**
 * Generate an AI description for invoice line from time entries
 * @param {Array} timeEntries - Array of time entry objects
 * @param {string} workTypeDescription - The work type description
 * @param {string} projectName - The project name (optional)
 * @returns {Promise<string>} AI-generated description
 */
export async function generateLineDescription(timeEntries, workTypeDescription, projectName = '') {
    return generateInvoiceLineDescription(timeEntries, workTypeDescription, projectName);
}

