-- Migration: Add company_address and company_email settings
-- This migration adds address and email address settings for the company

INSERT INTO system_settings (key, value) 
VALUES 
    ('company_address', NULL),
    ('company_email', NULL)
ON CONFLICT (key) DO NOTHING;
