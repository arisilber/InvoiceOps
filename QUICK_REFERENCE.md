# Quick Reference: Invoice Creation Service

## Function Signature

```typescript
async function createInvoiceFromTimeEntries(
  clientId: number,       // ID of the client
  startDate: string,      // Start date (YYYY-MM-DD)
  endDate: string,        // End date (YYYY-MM-DD)
  invoiceNumber: number,  // Invoice number (use getNextInvoiceNumber())
  invoiceDate: string,    // Invoice date (YYYY-MM-DD)
  dueDate: string         // Due date (YYYY-MM-DD)
): Promise<Invoice>
```

## Quick Start

### 1. Import the function
```javascript
import { createInvoiceFromTimeEntries } from './services/invoiceService.js';
```

### 2. Call the function
```javascript
const invoice = await createInvoiceFromTimeEntries(
  1,              // clientId
  '2024-01-01',  // startDate
  '2024-01-31',  // endDate
  1001,          // invoiceNumber
  '2024-02-01',  // invoiceDate
  '2024-02-15'   // dueDate
);
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/invoices/next-invoice-number` | Get next sequential invoice number |
| POST | `/api/invoices/preview-from-time-entries` | Preview invoice before creating |
| POST | `/api/invoices/from-time-entries` | Create invoice from time entries |

## Request/Response Examples

### Get Next Invoice Number
```bash
GET /api/invoices/next-invoice-number

Response:
{
  "next_invoice_number": 1002
}
```

### Preview Invoice
```bash
POST /api/invoices/preview-from-time-entries
Content-Type: application/json

{
  "client_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}

Response:
{
  "client": { "id": 1, "name": "Acme Corp", ... },
  "lines": [...],
  "subtotal_cents": 50000,
  "discount_cents": 5000,
  "total_cents": 45000,
  "total_entries": 5
}
```

### Create Invoice
```bash
POST /api/invoices/from-time-entries
Content-Type: application/json

{
  "client_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "invoice_number": 1001,
  "invoice_date": "2024-02-01",
  "due_date": "2024-02-15"
}

Response:
{
  "id": 1,
  "invoice_number": 1001,
  "status": "draft",
  "subtotal_cents": 50000,
  "discount_cents": 5000,
  "total_cents": 45000,
  "lines": [...]
}
```

## Business Logic Summary

1. **Fetch** uninvoiced time entries for client in date range
2. **Aggregate** by work_type_id + project_name
3. **Calculate** line amounts: `(minutes / 60) * hourly_rate`
4. **Sum** all lines to get subtotal
5. **Apply** discount: `subtotal * discount_percent / 100`
6. **Calculate** total: `subtotal - discount`
7. **Create** invoice with status='draft'
8. **Link** time entries to invoice

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Missing required fields |
| 404 | Client not found or no uninvoiced entries |
| 409 | Invoice number already exists |
| 500 | Server error |

## Files Created

- `server/services/invoiceService.js` - Main service
- `server/services/invoiceService.d.ts` - TypeScript types
- `server/services/README.md` - Full documentation
- `server/services/testInvoiceService.js` - Test script
- `EXAMPLE_CreateInvoiceComponent.jsx` - React example
- `INVOICE_CREATION_SUMMARY.md` - Complete summary

## Test Command

```bash
node server/services/testInvoiceService.js
```
