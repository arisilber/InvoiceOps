-- Rollback: Remove company_name column from users table
-- This rollback removes the company_name column added in migration 0004

ALTER TABLE users DROP COLUMN IF EXISTS company_name;
