-- Rollback: Remove description field from invoice_lines table

ALTER TABLE invoice_lines DROP COLUMN IF EXISTS description;

