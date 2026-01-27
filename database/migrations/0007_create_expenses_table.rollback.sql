-- Rollback: Drop expenses table
-- This rollback removes the expenses table and all related objects

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP INDEX IF EXISTS idx_expenses_expense_date;
DROP INDEX IF EXISTS idx_expenses_vendor;
DROP INDEX IF EXISTS idx_expenses_created_at;
DROP TABLE IF EXISTS expenses;
