-- Migration: Add refund support to expenses table
-- This migration adds is_refund boolean flag and updates constraints to allow negative amounts for refunds

-- Add is_refund column
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS is_refund BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop existing constraint if it exists (it might be named differently)
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_price_cents_check;

-- Add new constraint that allows negative amounts for refunds
ALTER TABLE expenses 
  ADD CONSTRAINT expenses_price_cents_check 
    CHECK (
      (is_refund = FALSE AND price_cents >= 0) OR 
      (is_refund = TRUE AND price_cents <= 0)
    );

-- Add index for filtering refunds
CREATE INDEX IF NOT EXISTS idx_expenses_is_refund 
  ON expenses(is_refund) 
  WHERE is_refund = TRUE;
