-- Rollback: Remove refund support from expenses table
-- This rollback removes the is_refund column and restores original constraints

-- Drop index
DROP INDEX IF EXISTS idx_expenses_is_refund;

-- Drop constraint
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_price_cents_check;

-- Restore original constraint (non-negative amounts only)
ALTER TABLE expenses 
  ADD CONSTRAINT expenses_price_cents_check 
    CHECK (price_cents >= 0);

-- Remove is_refund column
ALTER TABLE expenses 
  DROP COLUMN IF EXISTS is_refund;
