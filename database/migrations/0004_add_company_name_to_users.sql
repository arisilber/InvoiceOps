-- Migration: Add company_name column to users table
-- This migration adds a company_name column to the users table for storing the user's company name

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
