# Invoice Creation Flow Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Invoice Creation Process                      │
└─────────────────────────────────────────────────────────────────┘

1. User Input
   ├── Client ID
   ├── Date Range (start, end)
   ├── Invoice Number
   ├── Invoice Date
   └── Due Date

2. Validate Client
   ├── Query: SELECT * FROM clients WHERE id = ?
   ├── Get: hourly_rate_cents, discount_percent
   └── Error if not found

3. Fetch Time Entries
   ├── Query: SELECT * FROM time_entries
   │          WHERE client_id = ?
   │          AND work_date BETWEEN ? AND ?
   │          AND invoice_id IS NULL
   └── Error if none found

4. Aggregate by Work Type + Project
   ├── Group by: work_type_id + project_name
   ├── Sum: minutes_spent
   └── Track: time_entry_ids

5. Calculate Amounts
   ├── For each line:
   │   └── amount = (minutes / 60) * hourly_rate_cents
   ├── Subtotal = sum of all line amounts
   ├── Discount = subtotal * discount_percent / 100
   └── Total = subtotal - discount

6. Create Invoice (Transaction)
   ├── BEGIN
   ├── INSERT INTO invoices (...)
   ├── INSERT INTO invoice_lines (...) [for each line]
   ├── UPDATE time_entries SET invoice_id = ? [for each entry]
   ├── COMMIT
   └── ROLLBACK on error

7. Return Complete Invoice
   ├── Fetch invoice with client info
   ├── Fetch invoice lines with work type info
   └── Return combined object
```

## Data Flow

```
┌──────────────┐
│ time_entries │
│              │
│ id: 1        │     ┌─────────────────────────────────┐
│ client_id: 1 │────▶│ Aggregation Logic               │
│ work_type: 1 │     │                                 │
│ project: "A" │     │ Group by:                       │
│ minutes: 120 │     │   work_type_id + project_name   │
│              │     │                                 │
│ id: 2        │     │ Result:                         │
│ client_id: 1 │────▶│   [1, "A"] → 300 mins           │
│ work_type: 1 │     │   [2, "B"] → 180 mins           │
│ project: "A" │     │                                 │
│ minutes: 180 │     └─────────────────────────────────┘
│              │                      │
│ id: 3        │                      ▼
│ client_id: 1 │────▶         ┌──────────────┐
│ work_type: 2 │              │ Calculations │
│ project: "B" │              │              │
│ minutes: 180 │              │ Line 1:      │
└──────────────┘              │   300/60 * $100 = $500
                              │              │
                              │ Line 2:      │
                              │   180/60 * $100 = $300
                              │              │
                              │ Subtotal: $800
                              │ Discount (10%): $80
                              │ Total: $720
                              └──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │   invoices   │
                              │              │
                              │ id: 1        │
                              │ number: 1001 │
                              │ subtotal: 80000¢
                              │ discount: 8000¢
                              │ total: 72000¢
                              └──────────────┘
                                      │
                                      ▼
                              ┌──────────────────┐
                              │ invoice_lines    │
                              │                  │
                              │ Line 1:          │
                              │   work_type: 1   │
                              │   project: "A"   │
                              │   minutes: 300   │
                              │   amount: 50000¢ │
                              │                  │
                              │ Line 2:          │
                              │   work_type: 2   │
                              │   project: "B"   │
                              │   minutes: 180   │
                              │   amount: 30000¢ │
                              └──────────────────┘
```

## Database Transaction Flow

```
START TRANSACTION
    │
    ├─▶ Validate Client
    │   └─▶ SELECT * FROM clients WHERE id = ?
    │
    ├─▶ Fetch Time Entries
    │   └─▶ SELECT * FROM time_entries WHERE ...
    │
    ├─▶ Create Invoice
    │   └─▶ INSERT INTO invoices (...) RETURNING id
    │
    ├─▶ Create Invoice Lines (loop)
    │   └─▶ INSERT INTO invoice_lines (...)
    │
    ├─▶ Link Time Entries (loop)
    │   └─▶ UPDATE time_entries SET invoice_id = ?
    │
COMMIT
    │
    └─▶ Return Complete Invoice
```

## API Request Flow

```
Client (Browser)
    │
    │ POST /api/invoices/from-time-entries
    │ {
    │   "client_id": 1,
    │   "start_date": "2024-01-01",
    │   "end_date": "2024-01-31",
    │   "invoice_number": 1001,
    │   "invoice_date": "2024-02-01",
    │   "due_date": "2024-02-15"
    │ }
    ▼
Express Router (invoices.js)
    │
    │ Validate request body
    │ Extract parameters
    ▼
Invoice Service (invoiceService.js)
    │
    │ createInvoiceFromTimeEntries(...)
    │
    ├─▶ Database Queries
    │   ├─▶ Get client
    │   ├─▶ Get time entries
    │   ├─▶ Create invoice
    │   ├─▶ Create lines
    │   └─▶ Update entries
    │
    └─▶ Return invoice object
    │
    ▼
Express Router
    │
    │ res.status(201).json(invoice)
    ▼
Client (Browser)
    │
    │ Receive invoice data
    │ Update UI
    └─▶ Show success message
```

## Aggregation Example

```
Input Time Entries:
┌────┬──────────┬─────────┬─────────┬─────────┐
│ ID │ Client   │ Work    │ Project │ Minutes │
│    │          │ Type    │         │         │
├────┼──────────┼─────────┼─────────┼─────────┤
│ 1  │ Acme     │ Frontend│ Website │ 120     │
│ 2  │ Acme     │ Frontend│ Website │ 180     │
│ 3  │ Acme     │ Backend │ API     │ 240     │
│ 4  │ Acme     │ Frontend│ Mobile  │ 90      │
│ 5  │ Acme     │ Backend │ API     │ 150     │
└────┴──────────┴─────────┴─────────┴─────────┘

Aggregation Key: work_type_id + project_name
                        ↓

Aggregated Invoice Lines:
┌─────────┬─────────┬─────────┬────────┬────────┐
│ Work    │ Project │ Minutes │ Rate   │ Amount │
│ Type    │         │         │        │        │
├─────────┼─────────┼─────────┼────────┼────────┤
│ Frontend│ Website │ 300     │ $100/h │ $500   │
│ Backend │ API     │ 390     │ $100/h │ $650   │
│ Frontend│ Mobile  │ 90      │ $100/h │ $150   │
└─────────┴─────────┴─────────┴────────┴────────┘
                        ↓
                   Subtotal: $1,300
                   Discount (10%): $130
                   Total: $1,170
```

## State Transitions

```
Time Entry States:
┌─────────────┐
│ Uninvoiced  │  invoice_id = NULL
│             │
│ Can be      │
│ included in │
│ new invoice │
└──────┬──────┘
       │
       │ createInvoiceFromTimeEntries()
       │
       ▼
┌─────────────┐
│ Invoiced    │  invoice_id = 123
│             │
│ Cannot be   │
│ included in │
│ new invoice │
└─────────────┘

Invoice States:
┌───────┐
│ draft │  Initial state
└───┬───┘
    │
    │ (Future: send invoice)
    ▼
┌───────┐
│ sent  │
└───┬───┘
    │
    │ (Future: receive payment)
    ▼
┌───────┐
│ paid  │
└───────┘
```
