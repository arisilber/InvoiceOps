# Excel/CSV Import Format for Invoices with Time Tracking

This guide shows you exactly how to format your Excel/CSV file to import invoices with automatic time tracking.

## Quick Format Guide

### CSV Structure

Each **row** represents one **invoice line item**. Multiple rows with the same `invoice_number` are automatically grouped into one invoice.

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `invoice_number` | Unique invoice number | `1` |
| `client_name` | Must match existing client exactly | `Acme Corp` |
| `invoice_date` | Invoice date (YYYY-MM-DD) | `2024-01-15` |
| `due_date` | Due date (YYYY-MM-DD) | `2024-02-15` |
| `work_type_code` | Work type code (frontend/backend/infra) | `frontend` |
| `total_minutes` | **Minutes worked** (creates time entry automatically) | `480` |
| `hourly_rate_cents` | Hourly rate in cents | `10000` (=$100.00) |
| `amount_cents` | Line amount in cents | `80000` (=$800.00) |

### Optional Columns

| Column | Description | Example |
|--------|-------------|---------|
| `status` | Invoice status (draft/sent/paid/partially_paid/voided) | `paid` |
| `subtotal_cents` | Invoice subtotal in cents | `200000` |
| `discount_cents` | Discount amount in cents | `0` |
| `total_cents` | Invoice total in cents | `200000` |
| `project_name` | Project name | `Website Redesign` |
| `description` | Line item description | `Implemented homepage layout` |
| `work_date` | Date for time entry (defaults to invoice_date) | `2024-01-15` |

## Example Excel/CSV File

### Simple Example (One Invoice, Multiple Line Items)

```csv
invoice_number,client_name,invoice_date,due_date,status,work_type_code,project_name,total_minutes,hourly_rate_cents,amount_cents,description,work_date
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,480,10000,80000,Implemented homepage layout,2024-01-15
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,360,10000,60000,Added responsive design,2024-01-16
1,Acme Corp,2024-01-15,2024-02-15,paid,backend,API Development,360,10000,60000,Built authentication API,2024-01-17
```

**Result:**
- Creates Invoice #1 with 3 line items
- Automatically creates 3 time entries (480, 360, 360 minutes)
- All time entries linked to Invoice #1
- Total: 20 hours tracked and linked

### Multiple Invoices Example

```csv
invoice_number,client_name,invoice_date,due_date,status,work_type_code,project_name,total_minutes,hourly_rate_cents,amount_cents,description,work_date
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,480,10000,80000,Implemented homepage layout,2024-01-15
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,360,10000,60000,Added responsive design,2024-01-16
2,Tech Solutions,2024-02-01,2024-03-01,sent,frontend,Mobile App,600,12000,120000,Developed iOS interface,2024-02-01
2,Tech Solutions,2024-02-01,2024-03-01,sent,backend,Mobile App,300,12000,60000,Built REST API,2024-02-02
3,Acme Corp,2024-02-10,2024-03-10,draft,infra,DevOps Setup,240,15000,60000,Configured CI/CD pipeline,2024-02-10
```

**Result:**
- Invoice #1: 2 line items, 14 hours tracked
- Invoice #2: 2 line items, 15 hours tracked
- Invoice #3: 1 line item, 4 hours tracked
- All time entries automatically created and linked

## How Time Tracking Works

### Automatic Time Entry Creation

When you include `total_minutes` in your CSV:
1. ✅ Invoice is created
2. ✅ Invoice line item is created
3. ✅ **Time entry is automatically created** with those minutes
4. ✅ Time entry is **linked to the invoice** (not "uninvoiced")

### Time Entry Details

- **Date**: Uses `work_date` column if provided, otherwise uses `invoice_date`
- **Minutes**: Uses `total_minutes` from the line item
- **Description**: Uses `description` from the line item
- **Project**: Uses `project_name` from the line item
- **Linked**: Automatically linked to the invoice

## Excel Tips

### 1. Format Your Columns

- **Dates**: Format as `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Numbers**: Use whole numbers (no decimals for minutes, cents)
- **Text**: No quotes needed unless field contains commas

### 2. Handling Multiple Line Items

If one invoice has multiple line items, create multiple rows with the same `invoice_number`:

```
Row 1: invoice_number=1, work_type_code=frontend, total_minutes=480
Row 2: invoice_number=1, work_type_code=frontend, total_minutes=360
Row 3: invoice_number=1, work_type_code=backend, total_minutes=360
```

All three rows become one invoice with 3 line items.

### 3. Converting Hours to Minutes

If your data has hours, convert to minutes:
- 1 hour = 60 minutes
- 1.5 hours = 90 minutes
- 8 hours = 480 minutes

Excel formula: `=A1*60` (where A1 contains hours)

### 4. Converting Dollars to Cents

If your data has dollars, convert to cents:
- $100.00 = 10000 cents
- $1,500.50 = 150050 cents

Excel formula: `=A1*100` (where A1 contains dollars)

## Common Scenarios

### Scenario 1: Simple Invoice with One Line Item

```csv
invoice_number,client_name,invoice_date,due_date,work_type_code,total_minutes,hourly_rate_cents,amount_cents
1,Acme Corp,2024-01-15,2024-02-15,frontend,1200,10000,200000
```

### Scenario 2: Invoice with Multiple Work Types

```csv
invoice_number,client_name,invoice_date,due_date,work_type_code,project_name,total_minutes,hourly_rate_cents,amount_cents
1,Acme Corp,2024-01-15,2024-02-15,frontend,Website,600,10000,100000
1,Acme Corp,2024-01-15,2024-02-15,backend,Website,600,10000,100000
1,Acme Corp,2024-01-15,2024-02-15,infra,Website,300,15000,75000
```

### Scenario 3: Invoice with Different Work Dates

```csv
invoice_number,client_name,invoice_date,due_date,work_type_code,total_minutes,hourly_rate_cents,amount_cents,work_date
1,Acme Corp,2024-01-15,2024-02-15,frontend,480,10000,80000,2024-01-10
1,Acme Corp,2024-01-15,2024-02-15,frontend,360,10000,60000,2024-01-11
1,Acme Corp,2024-01-15,2024-02-15,frontend,360,10000,60000,2024-01-12
```

Each row creates a separate time entry with its own `work_date`.

## Validation Checklist

Before importing, verify:

- [ ] All `client_name` values match existing clients exactly
- [ ] All `work_type_code` values are valid (frontend/backend/infra or custom)
- [ ] All dates are in `YYYY-MM-DD` format
- [ ] All `total_minutes` are positive numbers
- [ ] All amounts are in cents (multiply dollars by 100)
- [ ] `invoice_number` values are unique (or grouped correctly for same invoice)
- [ ] No empty required fields

## After Import

After importing, verify:

1. ✅ Invoices appear in the Invoices list
2. ✅ Time entries appear in Time Tracking (linked to invoices)
3. ✅ Hours show in Dashboard (not as "uninvoiced")
4. ✅ Reports include the historical data

## Troubleshooting

**"Client not found"**
- Check that client name matches exactly (case-insensitive but spelling must match)

**"Work type not found"**
- Use: `frontend`, `backend`, or `infra` (or create custom work types first)

**Hours showing as "uninvoiced"**
- Make sure `total_minutes` column is included and has values > 0
- Time entries are created automatically when `total_minutes` is present

**Multiple invoices created instead of one**
- Make sure rows with same invoice have identical `invoice_number` value
- Check for extra spaces or different formatting
