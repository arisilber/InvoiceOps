-- InvoiceOps Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension if needed (optional, using SERIAL instead)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables in reverse order of dependencies (for clean reset)
DROP TABLE IF EXISTS payment_applications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS work_types CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS client_type CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;

-- Create custom ENUM types
CREATE TYPE client_type AS ENUM ('individual', 'company');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'voided');

-- clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    type client_type NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    hourly_rate_cents INTEGER NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- work_types table
CREATE TABLE work_types (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

-- invoices table (created before time_entries because time_entries references it)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number INTEGER UNIQUE NOT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (due_date >= invoice_date),
    CONSTRAINT non_negative_amounts CHECK (
        subtotal_cents >= 0 AND
        discount_cents >= 0 AND
        total_cents >= 0
    )
);

-- time_entries table (created after invoices because it references invoices)
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    work_type_id INTEGER NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    work_date DATE NOT NULL,
    minutes_spent INTEGER NOT NULL CHECK (minutes_spent > 0),
    detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- invoice_lines table
CREATE TABLE invoice_lines (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    work_type_id INTEGER NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT,
    project_name TEXT NOT NULL,
    total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
    hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents >= 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0)
);

-- payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_date DATE NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- payment_applications table
CREATE TABLE payment_applications (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    UNIQUE(payment_id, invoice_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX idx_payment_applications_payment_id ON payment_applications(payment_id);
CREATE INDEX idx_payment_applications_invoice_id ON payment_applications(invoice_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update updated_at on clients and invoices
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default work types
INSERT INTO work_types (code, description) VALUES
    ('frontend', 'Frontend Development'),
    ('backend', 'Backend Development'),
    ('infra', 'Infrastructure/DevOps');

