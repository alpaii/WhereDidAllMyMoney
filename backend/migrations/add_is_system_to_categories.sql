-- Migration: Add is_system column to categories table
-- Run this migration manually before starting the backend

-- Add is_system column with default value false
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- Note: is_system flag indicates system-defined categories that cannot be deleted by users
