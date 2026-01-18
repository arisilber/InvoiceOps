# Customer Statements – Implementation Plan

This document outlines the step-by-step implementation plan for the Customer Statements feature as specified in `docs/project/statements.md`.

## Implementation Status

- ✅ **Phase 1, Step 1.1**: Backend Core Service (`statementService.js`) - **COMPLETED**
- ✅ **Phase 2**: Backend API Routes (`server/routes/statements.js`) - **COMPLETED**
- ✅ **Phase 3**: HTML Generator (`server/utils/statementHtmlGenerator.js`) - **COMPLETED**
- ✅ **Phase 4**: Register Routes (`server/index.js`) - **COMPLETED**
- ✅ **Phase 5**: Frontend API Integration (`src/services/api.js`) - **COMPLETED**
- ✅ **Phase 6**: Frontend React Component - **COMPLETED**
- ⏳ **Phase 7**: Testing & Validation - **PENDING**
- ⏳ **Phase 8**: Documentation - **PENDING**

---

## Overview

The implementation will follow the existing codebase patterns:
- **Backend**: Express.js routes + service layer for business logic
- **Frontend**: React components with API integration
- **PDF Generation**: Puppeteer (reusing invoice PDF pattern)
- **HTML Generation**: Dedicated utility (similar to invoice HTML generator)

---

## Phase 1: Backend Core Service (statementService.js)

### Step 1.1: Create Statement Service ✅ **COMPLETED**
**File**: `server/services/statementService.js`

**Status**: ✅ Implemented and ready for use

**Purpose**: Core calculation logic for statement data (deterministic, reusable)

**Functions to implement**:

1. **`calculateBeginningBalance(clientId, startDate)`**
   - Calculates AR balance prior to statement period
   - Formula: Sum of invoices - Sum of payments (before start_date)
   - Excludes voided invoices
   - Returns: integer (cents)

2. **`fetchStatementData(clientId, startDate, endDate)`**
   - Fetches all transactions for the period
   - Returns combined array of invoices and payment applications
   - Includes:
     - Invoice: `id`, `invoice_number`, `invoice_date`, `total_cents`, `status`, `client_name`
     - Payment Application: `payment_id`, `invoice_id`, `amount_cents`, `payment_date`, `payment_note`, `invoice_number` (from related invoice)
   - Orders by date, then by type (invoices before payments), then by invoice_number/payment_id

3. **`calculateStatement(clientId, startDate, endDate)`**
   - Main function that orchestrates the statement calculation
   - Returns statement object:
     ```javascript
     {
       client_id,
       client_name,
       client_email,
       start_date,
       end_date,
       beginning_balance_cents,
       ending_balance_cents,
       period_invoices_total_cents,
       period_payments_total_cents,
       transactions: [
         {
           type: 'invoice' | 'payment',
           date: 'YYYY-MM-DD',
           document_number: 'INV-123' | 'PAY-456',
           description: string,
           amount_cents: integer (positive for invoices, negative for payments),
           running_balance_cents: integer,
           // Additional fields based on type
           invoice_id?: number,
           payment_id?: number,
           invoice_number?: number,
           payment_note?: string
         }
       ],
       company_name: string,
       company_address: string,
       company_email: string
     }
     ```

**SQL Queries implemented**:

- Beginning Balance (implemented as separate queries for clarity):
  ```sql
  -- Sum of invoices before start_date
  SELECT COALESCE(SUM(total_cents), 0) as total_invoices_cents
  FROM invoices
  WHERE client_id = $1
    AND status != 'voided'
    AND invoice_date < $2

  -- Sum of payments before start_date
  SELECT COALESCE(SUM(pa.amount_cents), 0) as total_payments_cents
  FROM payment_applications pa
  JOIN payments p ON pa.payment_id = p.id
  JOIN invoices i ON pa.invoice_id = i.id
  WHERE i.client_id = $1
    AND i.status != 'voided'
    AND p.payment_date < $2
  ```

- Period Transactions:
  ```sql
  -- Invoices in period
  SELECT 
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
  ORDER BY i.invoice_date, i.invoice_number

  -- Payment applications in period
  SELECT 
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
  ORDER BY p.payment_date, pa.id
  ```

**Validation**:
- Validate client exists
- Validate dates (start_date <= end_date)
- Handle edge cases (no transactions, negative balances, etc.)

**Implementation Notes**:
- ✅ All three functions implemented: `calculateBeginningBalance()`, `fetchStatementData()`, `calculateStatement()`
- ✅ Beginning balance calculation uses separate queries for invoices and payments (simpler and more accurate)
- ✅ Transaction ordering implemented: date ASC → type (invoice before payment) → invoice_number/payment_id ASC
- ✅ Running balance calculated correctly during transaction processing
- ✅ Company settings fetched from `system_settings` table (handles missing table gracefully)
- ✅ Full input validation (client existence, date format, date range)
- ✅ JSDoc comments added to all functions
- ✅ Follows existing codebase patterns (similar to `invoiceService.js`)
- ✅ No linting errors

---

## Phase 2: Backend API Routes (statements.js)

### Step 2.1: Create Statement Routes ✅ **COMPLETED**
**File**: `server/routes/statements.js`

**Status**: ✅ Implemented and ready for use

**Endpoints implemented**:

1. **`GET /api/statements/:clientId`** (JSON)
   - Query params: `start_date` (required), `end_date` (required)
   - Validates date format (YYYY-MM-DD)
   - Calls `statementService.calculateStatement()`
   - Returns JSON statement object

2. **`GET /api/statements/:clientId/html`** (HTML)
   - Query params: `start_date`, `end_date`
   - Generates HTML using `statementHtmlGenerator.generateStatementHTML()`
   - Returns HTML with `Content-Type: text/html`

3. **`GET /api/statements/:clientId/pdf`** (PDF)
   - Query params: `start_date`, `end_date`
   - Generates HTML
   - Uses Puppeteer to generate PDF (same pattern as invoice PDF)
   - Returns PDF with proper headers and filename
   - Filename: `Statement-{client_name}-{start_date}-to-{end_date}.pdf`

**Error Handling**:
- 400: Missing or invalid parameters
- 404: Client not found
- 500: Server errors (with logging)

**Authentication**:
- All routes protected with `authenticateToken` middleware

---

## Phase 3: HTML Generator (statementHtmlGenerator.js)

### Step 3.1: Create Statement HTML Generator ✅ **COMPLETED**
**File**: `server/utils/statementHtmlGenerator.js`

**Status**: ✅ Implemented and ready for use

**Function**: `generateStatementHTML(statement)`

**HTML Structure**:
- Company header (from system_settings)
- Statement title and period
- Client information
- Beginning balance line
- Transaction table with columns:
  - Date
  - Type
  - Document Number
  - Description
  - Amount (Debit/Credit)
  - Running Balance
- Summary section:
  - Beginning Balance
  - Period Invoices Total
  - Period Payments Total
  - Ending Balance

**Styling**:
- Reuse invoice HTML generator styling patterns
- Ledger-style layout (optimized for print)
- Ensure proper page breaks for multi-page statements
- Use same fonts and design system as invoices

**Key Requirements**:
- Amounts formatted as currency ($X,XXX.XX)
- Dates formatted as readable (e.g., "Jan 15, 2024")
- Invoices show as positive amounts
- Payments show as negative amounts (or in separate Debit/Credit columns)
- Running balance updates correctly
- Print-friendly CSS

**Implementation Notes**:
- ✅ Ledger-style layout with transaction table
- ✅ Beginning balance row highlighted
- ✅ Invoice rows vs payment rows with distinct styling (payments in green)
- ✅ Account summary section with beginning balance, invoices, payments, ending balance
- ✅ Company header from system_settings
- ✅ Client information section
- ✅ Responsive print-friendly CSS with proper page break handling
- ✅ Follows same design patterns as invoice HTML generator

---

## Phase 4: Register Routes

### Step 4.1: Add Routes to Server ✅ **COMPLETED**
**File**: `server/index.js`

**Status**: ✅ Implemented and ready for use

**Changes made**:
- Import: `import statementsRoutes from './routes/statements.js';`
- Register: `app.use('/api/statements', statementsRoutes);`

**Placement**: After settings routes registration

---

## Phase 5: Frontend API Integration

### Step 5.1: Add API Methods ✅ **COMPLETED**
**File**: `src/services/api.js`

**Status**: ✅ Implemented and ready for use

**Methods added**:

```javascript
// Get statement JSON
getStatement: async (clientId, startDate, endDate) => {
  return makeRequest(`${API_BASE_URL}/statements/${clientId}?start_date=${startDate}&end_date=${endDate}`);
},

// Get statement HTML
getStatementHTML: async (clientId, startDate, endDate) => {
  const response = await fetch(`${API_BASE_URL}/statements/${clientId}/html?start_date=${startDate}&end_date=${endDate}`, {
    headers: getAuthHeaders ? getAuthHeaders() : {},
  });
  if (!response.ok) throw new Error('Failed to fetch statement HTML');
  return response.text();
},

// Download statement PDF
downloadStatementPDF: async (clientId, startDate, endDate) => {
  const response = await fetch(`${API_BASE_URL}/statements/${clientId}/pdf?start_date=${startDate}&end_date=${endDate}`, {
    headers: getAuthHeaders ? getAuthHeaders() : {},
  });
  if (!response.ok) throw new Error('Failed to download statement PDF');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Statement-${clientId}-${startDate}-to-${endDate}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

**Implementation Notes**:
- ✅ All three methods implemented: `getStatement()`, `getStatementHTML()`, `downloadStatementPDF()`
- ✅ `getStatement()` uses the standard `makeRequest` helper for JSON responses
- ✅ `getStatementHTML()` and `downloadStatementPDF()` use direct `fetch` with manual token handling (consistent with `downloadInvoicePDF()`)
- ✅ Full authentication token support with automatic refresh on 401/403 responses
- ✅ Proper error handling with informative error messages
- ✅ PDF download triggers browser download with proper filename from server headers
- ✅ Follows existing codebase patterns (consistent with invoice PDF download)
- ✅ No linting errors

---

## Phase 6: Frontend React Component

### Step 6.1: Create Statement View Component ✅ **COMPLETED**
**File**: `src/components/StatementView.jsx`

**Status**: ✅ Implemented and ready for use

**Features implemented**:
- Client selector with optional route param prefill
- Date range defaults to current month
- Generate Statement action with loading state
- Statement display:
  - Client and period header
  - Beginning balance row
  - Transactions table with running balances
  - Summary totals table
- Download PDF and Print buttons (HTML print view)
- Empty states and error handling

**Implementation Notes**:
- ✅ Uses `api.getStatement()` to fetch JSON statement data
- ✅ Uses `api.getStatementHTML()` for print view (opens new window)
- ✅ Uses `api.downloadStatementPDF()` for PDF downloads
- ✅ Provides independent loading states for generate vs actions
- ✅ Matches existing UI patterns (cards, buttons, spacing)

### Step 6.2: Add Route to App ✅ **COMPLETED**
**File**: `src/App.jsx`

**Changes applied**:
- ✅ Import: `import StatementView from './components/StatementView';`
- ✅ Added route: `<Route path="/statements/:clientId?" element={<StatementView />} />`

**Optional Enhancement**:
- ✅ Add link in ClientDashboard to generate statement
- ✅ Add link in Sidebar for Statements page

---

## Phase 7: Testing & Validation

### Step 7.1: Test Core Logic
- Test beginning balance calculation
- Test transaction ordering (date, type, number)
- Test running balance calculation
- Test edge cases:
  - No transactions
  - All payments (negative balance)
  - Voided invoices excluded
  - Partial payments
  - Multiple payments on same date

### Step 7.2: Test API Endpoints
- Test JSON endpoint returns correct data
- Test HTML endpoint renders correctly
- Test PDF endpoint generates valid PDF
- Test error handling (invalid dates, missing client, etc.)
- Test authentication (unauthorized requests)

### Step 7.3: Test Frontend
- Test date range selection
- Test statement generation
- Test PDF download
- Test print functionality
- Test loading and error states
- Test responsive design

### Step 7.4: Integration Testing
- End-to-end flow: Generate statement → View → Download PDF
- Verify PDF matches on-screen display
- Verify calculations match database queries
- Verify statement is deterministic (same inputs = same output)

---

## Phase 8: Documentation

### Step 8.1: Update API Documentation
- Document new endpoints in relevant README files
- Add examples of request/response

### Step 8.2: Update Component Documentation
- Document StatementView component usage
- Add JSDoc comments to service functions

---

## Implementation Order (Recommended)

1. **Phase 1**: Backend Service (foundation)
2. **Phase 2**: API Routes (JSON endpoint first)
3. **Phase 3**: HTML Generator
4. **Phase 4**: Register Routes
5. **Phase 2 (continued)**: HTML and PDF endpoints
6. **Phase 5**: Frontend API Integration
7. **Phase 6**: React Component
8. **Phase 7**: Testing
9. **Phase 8**: Documentation

---

## Key Implementation Notes

### Date Handling
- All dates in YYYY-MM-DD format (ISO)
- Use database DATE type for comparisons
- Format for display in frontend/HTML only

### Currency Formatting
- Store as cents (integers) in database
- Format as dollars (cents / 100) for display
- Use consistent formatting function

### Transaction Ordering
- Critical for correct running balance
- Order: date ASC → type (invoice before payment) → invoice_number ASC / payment_id ASC

### Beginning Balance Calculation
- Must exclude voided invoices
- Must only include payments applied to client's invoices
- Use SQL aggregation for accuracy

### Determinism
- Same inputs must produce same output
- No random ordering or timestamps in calculations
- Use explicit ORDER BY clauses

---

## Dependencies

- Existing: Express, React, Puppeteer
- Database: PostgreSQL (Supabase)
- No new npm packages required

---

## Estimated Complexity

- **Backend Service**: Medium (complex SQL queries, balance calculations)
- **API Routes**: Low (similar to invoice routes)
- **HTML Generator**: Medium (ledger layout, print styling)
- **Frontend Component**: Medium (form handling, table display, PDF integration)

**Total Estimated Time**: 2-3 days for full implementation

---

## Future Enhancements (Out of Scope for Now)

- Email delivery of statements
- Automatic statement generation/scheduling
- Statement history/storage
- Aging buckets
- Credits/refunds/adjustments
- Export to CSV/Excel
