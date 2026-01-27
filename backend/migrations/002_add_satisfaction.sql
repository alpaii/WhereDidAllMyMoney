-- Migration: Add satisfaction column to expenses
-- Run this SQL against your PostgreSQL database

-- Add satisfaction column to expenses table (True=만족, False=불만족, NULL=미평가)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS satisfaction BOOLEAN;
