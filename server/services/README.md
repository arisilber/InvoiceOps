# Invoice Service

This service provides functionality to create invoices from time entries with automatic aggregation and calculation.

## Overview

The `invoiceService.js` module implements the business logic for creating invoices from time entries. It handles:

- Fetching uninvoiced time entries for a client within a date range
- Aggregating entries by work type and project
- Calculating line amounts based on hourly rates
- Applying client-level discounts
- Creating invoice records with proper transaction handling
- Linking time entries to the created invoice

## Business Rules

1. **Client and Date Range Selection**: User selects a client and a date range
2. **Time Entry Aggregation**: All time_entries for that client in that date range are aggregated into invoice_lines
3. **Aggregation Key**: Aggregation is by unique combination of `work_type_id` + `project_name`
4. **Line Amount Calculation**: `amount_cents = (total_minutes / 60) * client.hourly_rate_cents`
5. **Discount Application**: Discount is applied at invoice level: `discount_cents = subtotal_cents * client.discount_percent / 100`
6. **Total Calculation**: `total_cents = subtotal_cents - discount_cents`
7. **Invoice Numbering**: Invoice number is sequential but may be assigned manually
8. **Initial Status**: Invoice status starts as 'draft'
9. **Editability**: Invoices are editable after creation
10. **Optional Projects**: Projects are optional; project_name can be null or blank

## Functions

### `createInvoiceFromTimeEntries()`

Creates an invoice from time entries for a specific client and date range.

**Signature:**
```typescript
async function createInvoiceFromTimeEntries(
  clientId: number,
  startDate: string,
  endDate: string,
  invoiceNumber: number,
  invoiceDate: string,
  dueDate: string
): Promise<Invoice>
```

**Parameters:**
- `clientId` (number): The ID of the client
- `startDate` (string): Start date in YYYY-MM-DD format
- `endDate` (string): End date in YYYY-MM-DD format
- `invoiceNumber` (number): The invoice number (manually assigned)
- `invoiceDate` (string): Invoice date in YYYY-MM-DD format
- `dueDate` (string): Due date in YYYY-MM-DD format

**Returns:**
- Promise<Invoice>: The created invoice with lines and client information

**Example:**
```javascript
import { createInvoiceFromTimeEntries } from './services/invoiceService.js';

const invoice = await createInvoiceFromTimeEntries(
  1,                    // clientId
  '2024-01-01',        // startDate
  '2024-01-31',        // endDate
  1001,                // invoiceNumber
  '2024-02-01',        // invoiceDate
  '2024-02-15'         // dueDate
);

console.log(invoice);
// {
//   id: 1,
//   invoice_number: 1001,
//   client_id: 1,
//   client_name: 'Acme Corp',
//   status: 'draft',
//   subtotal_cents: 50000,
//   discount_cents: 5000,
//   total_cents: 45000,
//   lines: [
//     {
//       work_type_id: 1,
//       work_type_code: 'frontend',
//       project_name: 'Website Redesign',
//       total_minutes: 300,
//       hourly_rate_cents: 10000,
//       amount_cents: 50000
//     }
//   ]
// }
```

**Throws:**
- Error if client not found
- Error if no uninvoiced time entries found
- Error if invoice number already exists (unique constraint violation)

---

### `getNextInvoiceNumber()`

Gets the next available sequential invoice number.

**Signature:**
```typescript
async function getNextInvoiceNumber(): Promise<number>
```

**Returns:**
- Promise<number>: The next sequential invoice number

**Example:**
```javascript
import { getNextInvoiceNumber } from './services/invoiceService.js';

const nextNumber = await getNextInvoiceNumber();
console.log(nextNumber); // 1002
```

---

### `previewInvoiceFromTimeEntries()`

Previews what an invoice would look like before creating it. Useful for showing users what will be included in the invoice.

**Signature:**
```typescript
async function previewInvoiceFromTimeEntries(
  clientId: number,
  startDate: string,
  endDate: string
): Promise<InvoicePreview>
```

**Parameters:**
- `clientId` (number): The ID of the client
- `startDate` (string): Start date in YYYY-MM-DD format
- `endDate` (string): End date in YYYY-MM-DD format

**Returns:**
- Promise<InvoicePreview>: Preview data including aggregated lines and totals

**Example:**
```javascript
import { previewInvoiceFromTimeEntries } from './services/invoiceService.js';

const preview = await previewInvoiceFromTimeEntries(
  1,                    // clientId
  '2024-01-01',        // startDate
  '2024-01-31'         // endDate
);

console.log(preview);
// {
//   client: {
//     id: 1,
//     name: 'Acme Corp',
//     hourly_rate_cents: 10000,
//     discount_percent: 10
//   },
//   lines: [
//     {
//       work_type_code: 'frontend',
//       project_name: 'Website Redesign',
//       total_minutes: 300,
//       amount_cents: 50000,
//       entry_count: 5
//     }
//   ],
//   subtotal_cents: 50000,
//   discount_cents: 5000,
//   total_cents: 45000,
//   total_entries: 5,
//   date_range: { start: '2024-01-01', end: '2024-01-31' }
// }
```

## API Endpoints

The invoice service is exposed through the following REST API endpoints:

### `GET /api/invoices/next-invoice-number`

Get the next available invoice number.

**Response:**
```json
{
  "next_invoice_number": 1002
}
```

---

### `POST /api/invoices/preview-from-time-entries`

Preview an invoice before creating it.

**Request Body:**
```json
{
  "client_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**
```json
{
  "client": {
    "id": 1,
    "name": "Acme Corp",
    "hourly_rate_cents": 10000,
    "discount_percent": 10
  },
  "lines": [
    {
      "work_type_code": "frontend",
      "project_name": "Website Redesign",
      "total_minutes": 300,
      "amount_cents": 50000,
      "entry_count": 5
    }
  ],
  "subtotal_cents": 50000,
  "discount_cents": 5000,
  "total_cents": 45000,
  "total_entries": 5
}
```

---

### `POST /api/invoices/from-time-entries`

Create an invoice from time entries.

**Request Body:**
```json
{
  "client_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "invoice_number": 1001,
  "invoice_date": "2024-02-01",
  "due_date": "2024-02-15"
}
```

**Response:**
```json
{
  "id": 1,
  "invoice_number": 1001,
  "client_id": 1,
  "client_name": "Acme Corp",
  "invoice_date": "2024-02-01",
  "due_date": "2024-02-15",
  "status": "draft",
  "subtotal_cents": 50000,
  "discount_cents": 5000,
  "total_cents": 45000,
  "lines": [
    {
      "id": 1,
      "work_type_id": 1,
      "work_type_code": "frontend",
      "project_name": "Website Redesign",
      "total_minutes": 300,
      "hourly_rate_cents": 10000,
      "amount_cents": 50000
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `404 Not Found`: Client not found or no uninvoiced time entries
- `409 Conflict`: Invoice number already exists

## Transaction Handling

The `createInvoiceFromTimeEntries` function uses database transactions to ensure data integrity:

1. Begins a transaction
2. Validates client exists
3. Fetches uninvoiced time entries
4. Creates the invoice record
5. Creates invoice line items
6. Updates time entries to link them to the invoice
7. Commits the transaction

If any step fails, the entire transaction is rolled back, ensuring the database remains in a consistent state.

## Testing

Example test scenarios:

```javascript
// Test 1: Create invoice with multiple work types
const invoice1 = await createInvoiceFromTimeEntries(
  1, '2024-01-01', '2024-01-31', 1001, '2024-02-01', '2024-02-15'
);

// Test 2: Preview before creating
const preview = await previewInvoiceFromTimeEntries(
  1, '2024-02-01', '2024-02-28'
);
console.log(`Will create invoice for ${preview.total_entries} entries`);

// Test 3: Get next invoice number
const nextNum = await getNextInvoiceNumber();
const invoice2 = await createInvoiceFromTimeEntries(
  2, '2024-01-01', '2024-01-31', nextNum, '2024-02-01', '2024-02-15'
);

// Test 4: Handle errors
try {
  await createInvoiceFromTimeEntries(
    999, '2024-01-01', '2024-01-31', 1003, '2024-02-01', '2024-02-15'
  );
} catch (error) {
  console.error('Expected error:', error.message); // "Client with ID 999 not found"
}
```

## Notes

- All monetary amounts are stored in cents to avoid floating-point precision issues
- Time entries are marked as invoiced by setting their `invoice_id` field
- Once a time entry is linked to an invoice, it won't appear in future invoice creation queries
- The service handles null/empty project names by normalizing them to empty strings
- Rounding is applied when calculating amounts to ensure integer cent values
