-- Migration: Add description field to invoice_lines table
-- This migration adds a description field to store AI-generated descriptions of time entries

ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS description TEXT;

