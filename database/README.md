# Database Setup

This directory contains the PostgreSQL database schema for InvoiceOps.

## Prerequisites

- PostgreSQL installed and running on your local machine
- `psql` command-line tool (comes with PostgreSQL) or a database client like pgAdmin

## Setup Instructions

### 1. Create the Database

Connect to PostgreSQL and create a new database:

```bash
# Connect to PostgreSQL (you may need to adjust the connection details)
psql -U postgres

# Create the database
CREATE DATABASE invoiceops;

# Exit psql
\q
```

### 2. Run the Schema

Run the schema file to create all tables:

```bash
# From the project root directory
psql -U postgres -d invoiceops -f database/schema.sql
```

Or if you're already connected to the database:

```bash
psql -U postgres -d invoiceops
\i database/schema.sql
```

### 3. Verify the Setup

Connect to the database and verify tables were created:

```bash
psql -U postgres -d invoiceops

# List all tables
\dt

# Check a specific table structure
\d clients

# Exit
\q
```

## Database Schema Overview

### Tables

- **clients**: Client information (individual or company)
- **work_types**: Types of work (frontend, backend, infra)
- **time_entries**: Time tracking entries for billing (optionally linked to an invoice via `invoice_id`)
- **invoices**: Invoice records
- **invoice_lines**: Line items for each invoice
- **payments**: Payment records
- **payment_applications**: Links payments to invoices

### Default Data

The schema includes default work types:
- `frontend` - Frontend Development
- `backend` - Backend Development
- `infra` - Infrastructure/DevOps

## Connection String

For connecting to this database from your application, use a connection string like:

```
postgresql://username:password@localhost:5432/invoiceops
```

Update `username` and `password` with your PostgreSQL credentials.

## Notes

- The schema uses `SERIAL` for auto-incrementing primary keys
- Timestamps use `TIMESTAMP WITH TIME ZONE` for accurate time tracking
- Foreign key constraints are set up with appropriate CASCADE/RESTRICT behaviors
- Indexes are created on frequently queried columns for performance
- Triggers automatically update the `updated_at` timestamp on `clients` and `invoices` tables

