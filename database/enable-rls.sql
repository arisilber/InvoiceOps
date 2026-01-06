-- Enable Row Level Security (RLS) for all tables
-- This script enables RLS and creates basic policies

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role (postgres) full access
-- Service role bypasses RLS by default, but these policies ensure
-- that if you add authenticated user access later, the service role still works

-- Clients policies
CREATE POLICY "Service role can do everything on clients"
    ON clients FOR ALL
    USING (true)
    WITH CHECK (true);

-- Work types policies
CREATE POLICY "Service role can do everything on work_types"
    ON work_types FOR ALL
    USING (true)
    WITH CHECK (true);

-- Invoices policies
CREATE POLICY "Service role can do everything on invoices"
    ON invoices FOR ALL
    USING (true)
    WITH CHECK (true);

-- Time entries policies
CREATE POLICY "Service role can do everything on time_entries"
    ON time_entries FOR ALL
    USING (true)
    WITH CHECK (true);

-- Invoice lines policies
CREATE POLICY "Service role can do everything on invoice_lines"
    ON invoice_lines FOR ALL
    USING (true)
    WITH CHECK (true);

-- Payments policies
CREATE POLICY "Service role can do everything on payments"
    ON payments FOR ALL
    USING (true)
    WITH CHECK (true);

-- Payment applications policies
CREATE POLICY "Service role can do everything on payment_applications"
    ON payment_applications FOR ALL
    USING (true)
    WITH CHECK (true);


