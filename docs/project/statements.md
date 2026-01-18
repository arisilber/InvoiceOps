# Customer Statements – Requirements

## Objective

Implement Customer Statements in InvoiceOps to present Accounts Receivable (AR) activity over time. Statements must be suitable for internal use and customer-facing via sending them to customers, support printing, and display a running balance.

---

## 1. Scope

### 1.1 Purpose

- Provide a clear, chronological view of customer AR activity
- Support reconciliation, transparency, and customer communication (via sending statements to customers)

### 1.2 Audience

- Internal users (finance, operations) - primary users who generate and view statements
- Customers - recipients of statements sent to them (no customer access/portal)

---

## 2. Statement Definition

- Statements are period-based (start date + end date)
- Statements are generated per client (`client_id`)
- Statements include all documents, both open and closed
- A running balance is displayed across the statement

---

## 3. Supported Financial Documents

### 3.1 Included

- Invoices
- Payments

### 3.2 Excluded

- Aging buckets (explicitly not supported)
- Credits, adjustments, or write-offs (out of scope for this phase)

---

## 4. Accounting Logic

### 4.1 Balance Impact Rules

- Invoices increase the balance (using `invoice.total_cents`)
- Payments decrease the balance (using `payment_application.amount_cents` for the specific client)
- Payments are linked to invoices via the `payment_applications` table
- Each `payment_application` specifies how much of a payment is applied to each invoice
- Partial payments are supported and tracked at the invoice level

### 4.2 Data Model

- **Invoices**: `id`, `invoice_number`, `client_id`, `invoice_date`, `total_cents`, `status`
- **Payments**: `id`, `payment_date`, `amount_cents`, `note`
- **Payment Applications**: `payment_id`, `invoice_id`, `amount_cents` (links payments to invoices)
- For client statements, only payments applied to that client's invoices are included

### 4.3 Authoritative Formula

**Running Balance = Prior Balance + Invoice Amount − Payment Amount**

---

## 5. Beginning Balance

- Beginning Balance is defined as the net AR balance of all activity strictly prior to the statement start date for the specific client
- Calculated as:
  - Sum of all `invoice.total_cents` where `invoice.client_id = statement client` AND `invoice.invoice_date < statement start date` AND `invoice.status != 'voided'`
  - Minus sum of all `payment_application.amount_cents` where `payment.payment_date < statement start date` AND `payment_application.invoice_id` references an invoice for the statement client

The beginning balance is displayed as the first line item on the statement.

---

## 6. Transaction Ordering

- All statement rows are ordered by transaction date
- For invoices: use `invoice.invoice_date`
- For payments: use `payment.payment_date`
- If multiple transactions share the same date:
  - Invoices appear before payments
  - Within invoices: order by `invoice_number` (ascending)
  - Within payments: order by `payment.id` (ascending)

This ordering preserves intuitive balance progression.

---

## 7. Statement Line Items

Each line item includes:

- **Transaction date**
- **Document type** (Invoice or Payment)
- **Document number or reference**
  - For invoices: `"INV-{invoice_number}"`
  - For payments: `"PAY-{payment_id}"` or payment reference
- **Description**
  - For invoices: invoice summary or memo (if stored)
  - For payments: `payment.note` + invoice reference(s) it applies to
- **Amount**
  - For invoices: `invoice.total_cents` (positive)
  - For payments: `payment_application.amount_cents` for this client's invoice (negative)
- **Running balance**

### 7.1 Display Rules

- Invoices and payments appear as separate rows
- Each `payment_application` for the client's invoices appears as a separate line item
- If a payment is applied to multiple invoices for the same client on the same date, each application appears as its own row
- Partial payments are shown with their specific applied amounts

---

## 8. Period Activity

- Statement body includes:
  - All invoices where `invoice.client_id = statement client` AND `invoice.invoice_date >= start date` AND `invoice.invoice_date <= end date` AND `invoice.status != 'voided'`
  - All `payment_applications` where `payment.payment_date >= start date` AND `payment.payment_date <= end date` AND `payment_application.invoice_id` references an invoice for the statement client
  - Payments affect balance based on their application amounts to the client's invoices

This follows standard AR ledger behavior.

---

## 9. Totals & Summary

Each statement must display:

- Beginning Balance
- Total Invoices (within the period)
- Total Payments (within the period)
- Ending Balance

### 9.1 Ending Balance Calculation

**Ending Balance = Beginning Balance + Period Invoices − Period Payments**

---

## 10. Printing & Output

- Statements must be printable
- Printing must reuse the same PDF generation mechanism as invoices
- Use Puppeteer to generate PDF from HTML (same as invoice PDF generation in `server/routes/invoices.js`)
- HTML template generated by statement-specific function (similar to `generateInvoiceHTML` in `server/utils/htmlGenerator.js`)
- Reuse company information from `system_settings` table (`company_name`, `company_address`, `company_email`)
- Layout should be ledger-style and optimized for print
- Routes: `GET /api/statements/:clientId/pdf?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

---

## 11. Access & Permissions

- All statement endpoints require authentication (via `authenticateToken` middleware)
- Internal users can generate statements for any client
- Customer access/portal is out of scope for this phase (statements are sent to customers, not accessed by them)
- Statements are generated on demand (no scheduled automation)
- API endpoints:
  - `GET /api/statements/:clientId?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (JSON)
  - `GET /api/statements/:clientId/html?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (HTML)
  - `GET /api/statements/:clientId/pdf?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (PDF)

---

## 12. Data Integrity & Corrections

- Financial records are treated as append-only for balance calculations
- Voided invoices (`status = 'voided'`) are excluded from statement calculations
- All other invoice statuses (`'draft'`, `'sent'`, `'paid'`, `'partially_paid'`) are included
- Payments are always included (no status field)
- No reversing entries are currently modeled; voided invoices are simply excluded

---

## 13. Determinism & Reuse

- Statement generation must be deterministic
- Same inputs (`client_id`, `start_date`, `end_date`) produce the same output
- Core calculation logic must be reusable for:
  - On-screen display (React component)
  - HTML rendering (server endpoint)
  - PDF rendering (via Puppeteer)
- Recommended structure:
  - `server/services/statementService.js` - core calculation logic
  - `server/routes/statements.js` - API endpoints
  - `server/utils/statementHtmlGenerator.js` - HTML template generation
  - `src/components/StatementView.jsx` - React component for on-screen display

---

## 14. Acceptance Criteria

- Beginning balance reflects all prior activity accurately
- Running balance updates correctly for mixed invoices and payments
- Partial payments reduce balance on their transaction date
- Ending balance matches calculated totals
- Printed statement matches on-screen values exactly

---

## 15. Technical Implementation Notes

- **Database**: PostgreSQL (via Supabase)
- **Backend**: Express.js (Node.js)
- **Frontend**: React 19 (Vite)
- **PDF Generation**: Puppeteer
- **Date format**: YYYY-MM-DD (ISO format)
- **Currency**: All amounts stored in cents (integers)
- **Currency display**: Format as dollars (cents / 100)

---

## 16. Out of Scope (For Now)

- Aging buckets
- Credits, refunds, adjustments, or write-offs
- External accounting system synchronization
- Automatic statement generation/scheduling
- Email delivery of statements
