# Legacy Data Import Guide

This guide explains how to import historical invoices and payments from before you started using InvoiceOps.

## Overview

The Legacy Data Import feature allows you to import:
- **Historical Invoices** with their line items
- **Historical Payments** linked to invoices
- **Historical Time Entries** to track hours worked

This ensures your reports include all historical data, giving you a complete view of your business including hours worked, revenue, and payment history.

## Accessing the Import Tool

1. Navigate to **"Import Legacy Data"** in the sidebar
2. Choose whether to import **Invoices**, **Payments**, or **Time Entries**
3. Download the template to see the expected format
4. Prepare your data file (JSON or CSV)
5. Upload and import

**Important:** To track hours worked in your reports, you need to import **Time Entries**. Importing only invoices will show revenue but not hours worked.

## Import Format

### JSON Format (Recommended)

#### For Invoices:

```json
{
  "invoices": [
    {
      "invoice_number": 1,
      "client_name": "Acme Corp",
      "invoice_date": "2024-01-15",
      "due_date": "2024-02-15",
      "status": "paid",
      "subtotal_cents": 100000,
      "discount_cents": 0,
      "total_cents": 100000,
      "lines": [
        {
          "work_type_code": "frontend",
          "project_name": "Website Redesign",
          "total_minutes": 1200,
          "hourly_rate_cents": 10000,
          "amount_cents": 200000,
          "description": "Implemented new homepage layout",
          "work_date": "2024-01-15",
          "time_entries": [
            {
              "work_date": "2024-01-15",
              "minutes_spent": 480,
              "detail": "Implemented new homepage layout"
            },
            {
              "work_date": "2024-01-16",
              "minutes_spent": 360,
              "detail": "Added responsive design"
            },
            {
              "work_date": "2024-01-17",
              "minutes_spent": 360,
              "detail": "Fixed cross-browser issues"
            }
          ]
        }
      ]
    }
  ]
}
```

**Required Fields:**
- `invoice_number`: Unique invoice number (must not already exist)
- `client_name`: Must match an existing client name exactly
- `invoice_date`: Date in YYYY-MM-DD format
- `due_date`: Date in YYYY-MM-DD format
- `lines`: Array of invoice line items

**Line Item Required Fields:**
- `work_type_code`: Must match an existing work type code (e.g., "frontend", "backend", "infra")
- `total_minutes`: Total minutes for this line (will automatically create linked time entries)
- `hourly_rate_cents`: Hourly rate in cents
- `amount_cents`: Line amount in cents

**Optional Fields:**
- `status`: "draft", "sent", "paid", "partially_paid", or "voided" (defaults to "draft")
- `subtotal_cents`: Subtotal in cents (defaults to 0)
- `discount_cents`: Discount amount in cents (defaults to 0)
- `total_cents`: Total in cents (defaults to 0)
- `project_name`: Project name (optional)
- `description`: Line item description (optional)
- `work_date`: Work date for time entries (defaults to invoice_date)
- `time_entries`: Array of detailed time entries (optional - if not provided, creates one entry with total_minutes)
  - `work_date`: Date for this specific entry
  - `minutes_spent`: Minutes for this entry
  - `detail`: Description for this entry
  - `project_name`: Project name for this entry

**Automatic Time Entry Creation:**
When you import an invoice with line items that have `total_minutes`, the system automatically creates time entries linked to that invoice. This means:
- The hours will be tracked and appear in your reports
- They will be linked to the invoice (not showing as "uninvoiced")
- You can see the hours worked for each invoice

If you provide a `time_entries` array in the line item, it will create multiple time entries. Otherwise, it creates a single time entry with the total minutes.

#### For Payments:

```json
{
  "payments": [
    {
      "payment_date": "2024-02-20",
      "amount_cents": 100000,
      "note": "Payment received via bank transfer",
      "applications": [
        {
          "invoice_number": 1,
          "amount_cents": 100000
        }
      ]
    }
  ]
}
```

**Required Fields:**
- `payment_date`: Date in YYYY-MM-DD format
- `amount_cents`: Payment amount in cents

**Optional Fields:**
- `note`: Payment note/description
- `applications`: Array of payment applications to invoices
  - `invoice_number`: Must match an existing invoice number
  - `amount_cents`: Amount applied to this invoice

### CSV Format

The import tool also supports CSV format. For invoices, each row represents a line item, and invoices are automatically grouped by `invoice_number`. For payments, each row represents a payment.

**Invoice CSV Columns:**
- `invoice_number`, `client_name`, `invoice_date`, `due_date`, `status` (optional)
- `subtotal_cents`, `discount_cents`, `total_cents` (optional)
- `work_type_code`, `project_name` (optional), `total_minutes`, `hourly_rate_cents`, `amount_cents`, `description` (optional)
- `work_date` (optional - defaults to invoice_date for time entries)

**CSV Format for Invoices with Time Tracking:**

Each row represents one line item. Multiple rows with the same `invoice_number` are grouped into one invoice. The `total_minutes` column automatically creates time entries linked to the invoice.

Example CSV:
```csv
invoice_number,client_name,invoice_date,due_date,status,work_type_code,project_name,total_minutes,hourly_rate_cents,amount_cents,description,work_date
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,480,10000,80000,Implemented homepage layout,2024-01-15
1,Acme Corp,2024-01-15,2024-02-15,paid,frontend,Website Redesign,360,10000,60000,Added responsive design,2024-01-16
1,Acme Corp,2024-01-15,2024-02-15,paid,backend,API Development,360,10000,60000,Built authentication API,2024-01-17
2,Tech Solutions,2024-02-01,2024-03-01,sent,frontend,Mobile App,600,12000,120000,Developed iOS interface,2024-02-01
```

This creates:
- Invoice #1 with 3 line items (total 1200 minutes = 20 hours)
- Invoice #2 with 1 line item (600 minutes = 10 hours)
- Time entries automatically created and linked to each invoice
- Hours tracked and linked (not showing as "uninvoiced")

**Important:** 
- Each row = one invoice line item
- Same `invoice_number` = same invoice (multiple rows grouped)
- `total_minutes` = automatically creates time entry linked to invoice
- `work_date` = date for the time entry (defaults to `invoice_date` if not provided)

**Payment CSV Columns:**
- `payment_date`, `amount_cents`, `note` (optional), `invoice_number` (optional)

#### For Time Entries:

```json
{
  "time_entries": [
    {
      "client_name": "Acme Corp",
      "work_type_code": "frontend",
      "project_name": "Website Redesign",
      "work_date": "2024-01-15",
      "minutes_spent": 120,
      "detail": "Implemented new homepage layout",
      "invoice_number": 1
    }
  ]
}
```

**Required Fields:**
- `client_name`: Must match an existing client name exactly
- `work_type_code`: Must match an existing work type code
- `work_date`: Date in YYYY-MM-DD format
- `minutes_spent`: Number of minutes worked (positive number)

**Optional Fields:**
- `project_name`: Project name
- `detail`: Description of work done
- `invoice_number`: Link this time entry to an existing invoice (must match an invoice number)

**Time Entry CSV Columns:**
- `client_name`, `work_type_code`, `work_date`, `minutes_spent`
- `project_name` (optional), `detail` (optional), `invoice_number` (optional)

## Important Notes

1. **Client Names Must Match**: The `client_name` in your import file must exactly match an existing client name in your system (case-insensitive).

2. **Work Type Codes Must Match**: The `work_type_code` must match an existing work type code. Default work types are:
   - `frontend` - Frontend Development
   - `backend` - Backend Development
   - `infra` - Infrastructure/DevOps

3. **Invoice Numbers Must Be Unique**: Each invoice number must be unique and not already exist in the system.

4. **Payment Invoice Numbers**: When importing payments, the `invoice_number` in applications must match an existing invoice (either imported or created in the system).

5. **Amounts in Cents**: All monetary values are in cents (e.g., $100.00 = 10000 cents).

6. **Dates**: All dates must be in YYYY-MM-DD format.

## Step-by-Step Process

1. **Prepare Your Data**
   - Export your historical invoices/payments from your old system
   - Format them according to the template
   - Ensure client names and work type codes match your system

2. **Create Clients First** (if needed)
   - If you have invoices for clients that don't exist yet, create them first in the Clients section

3. **Create Work Types** (if needed)
   - If you used work types that don't exist, create them first in the Work Types section

4. **Import Invoices**
   - Go to Import Legacy Data
   - Select "Import Invoices"
   - Upload your JSON or CSV file
   - Review the preview
   - Click Import

5. **Import Time Entries** (optional - only if you need separate time entries)
   - If your invoices already have `total_minutes` in line items, time entries are created automatically
   - Only use this if you have time entries that weren't part of invoices
   - Select "Import Time Entries"
   - Upload your time entries file
   - Include `invoice_number` to link entries to imported invoices
   - Review and import

6. **Import Payments** (if applicable)
   - Select "Import Payments"
   - Upload your payments file
   - Review and import

7. **Verify**
   - Check your Invoices list to see imported invoices
   - Check your Time Entries list to see imported entries
   - Check your Payments list to see imported payments
   - Verify reports include the historical data including hours worked

## Troubleshooting

**"Client not found" error:**
- Ensure the client name in your import file exactly matches an existing client
- Create the client first if it doesn't exist

**"Work type not found" error:**
- Ensure the work type code matches an existing work type
- Create the work type first if needed

**"Invoice number already exists" error:**
- The invoice number is already in the system
- Use a different invoice number or skip that invoice

**"Invoice number not found" (for payments):**
- The invoice must be imported or created before importing payments that reference it
- Import invoices first, then payments

## Best Practices

1. **Import in Order**: 
   - Import invoices first (they automatically create linked time entries if `total_minutes` is provided)
   - Import additional time entries only if you have entries not covered by invoices
   - Import payments that reference those invoices
2. **Automatic Time Entry Creation**: When importing invoices with `total_minutes` in line items, time entries are automatically created and linked. This is the easiest way to track hours!
3. **Track Hours Worked**: 
   - **Recommended**: Include `total_minutes` in invoice line items - time entries are created automatically
   - **Alternative**: Import separate time entries and link them using `invoice_number`
4. **Detailed Time Entries**: If you want to break down a line item into multiple time entries (e.g., different dates), use the `time_entries` array in the line item
4. **Test with Small Batch**: Start with a small batch to verify the format works
5. **Backup First**: Consider backing up your database before large imports
6. **Verify Totals**: After importing, verify that totals match your expectations
7. **Check Reports**: Verify that imported data appears correctly in your reports, including hours worked

## Example Use Case

You have 3 months of historical data:
- 12 invoices from January-March
- 150 time entries tracking hours worked
- 8 payments received during that period

**Steps:**
1. Export invoices from your old system (with line items including `total_minutes`)
2. Format as JSON using the template
3. Import all 12 invoices - this automatically creates time entries linked to each invoice!
4. Export payments from your old system
5. Format payments JSON with applications linking to invoice numbers
6. Import all 8 payments
7. Verify in Reports/Dashboard that historical data is included, including hours worked

**Note:** If your invoice line items include `total_minutes`, you don't need to separately import time entries - they're created automatically and linked to the invoices!

Your reports will now show complete data including those 3 months, with accurate hours worked tracking!
