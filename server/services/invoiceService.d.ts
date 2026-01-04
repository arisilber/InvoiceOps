/**
 * TypeScript type definitions for InvoiceOps
 * This file provides type safety for the invoice creation service
 */

export interface Client {
    id: number;
    type: 'individual' | 'company';
    name: string;
    email: string;
    hourly_rate_cents: number;
    discount_percent: number;
    created_at: Date;
    updated_at: Date;
}

export interface WorkType {
    id: number;
    code: string;
    description: string;
}

export interface TimeEntry {
    id: number;
    client_id: number;
    work_type_id: number;
    invoice_id: number | null;
    project_name: string;
    work_date: string;
    minutes_spent: number;
    detail: string | null;
    created_at: Date;
}

export interface InvoiceLine {
    id: number;
    invoice_id: number;
    work_type_id: number;
    project_name: string;
    total_minutes: number;
    hourly_rate_cents: number;
    amount_cents: number;
    work_type_code?: string;
    work_type_description?: string;
}

export interface Invoice {
    id: number;
    invoice_number: number;
    client_id: number;
    invoice_date: string;
    due_date: string;
    status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'voided';
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    created_at: Date;
    updated_at: Date;
    client_name?: string;
    client_email?: string;
    client_type?: 'individual' | 'company';
    lines?: InvoiceLine[];
}

export interface InvoicePreview {
    client: Client;
    lines: Array<{
        work_type_id: number;
        work_type_code: string;
        work_type_description: string;
        project_name: string;
        total_minutes: number;
        hourly_rate_cents: number;
        amount_cents: number;
        entry_count: number;
    }>;
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    total_entries: number;
    date_range: {
        start: string;
        end: string;
    };
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
 * @param clientId - The ID of the client
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param invoiceNumber - The invoice number (manually assigned)
 * @param invoiceDate - Invoice date in YYYY-MM-DD format
 * @param dueDate - Due date in YYYY-MM-DD format
 * @returns The created invoice with lines
 */
export declare function createInvoiceFromTimeEntries(
    clientId: number,
    startDate: string,
    endDate: string,
    invoiceNumber: number,
    invoiceDate: string,
    dueDate: string
): Promise<Invoice>;

/**
 * Get the next available invoice number
 * @returns The next sequential invoice number
 */
export declare function getNextInvoiceNumber(): Promise<number>;

/**
 * Get preview of time entries that would be included in an invoice
 * @param clientId - The ID of the client
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Preview data including aggregated lines and totals
 */
export declare function previewInvoiceFromTimeEntries(
    clientId: number,
    startDate: string,
    endDate: string
): Promise<InvoicePreview>;
