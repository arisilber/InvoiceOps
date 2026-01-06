-- Rollback: Remove migrations tracking table
-- WARNING: This will remove the migrations tracking table
-- Only run this if you need to completely reset the migration system

DROP INDEX IF EXISTS idx_migrations_name;
DROP TABLE IF EXISTS migrations;

