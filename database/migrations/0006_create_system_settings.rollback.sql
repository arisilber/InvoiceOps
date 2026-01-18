-- Rollback: Remove system_settings table
-- This rollback removes the system_settings table added in migration 0004

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
DROP INDEX IF EXISTS idx_system_settings_key;
DROP TABLE IF EXISTS system_settings;
