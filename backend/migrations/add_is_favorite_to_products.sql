-- Add is_favorite column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
