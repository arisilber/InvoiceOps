-- Rollback: Remove company_address and company_email settings
-- This rollback removes the company_address and company_email settings added in migration 0005

DELETE FROM system_settings WHERE key IN ('company_address', 'company_email');
