-- Migration: Add stores table and store_id column to expenses
-- Run this SQL against your PostgreSQL database

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id for stores
CREATE INDEX IF NOT EXISTS ix_stores_user_id ON stores(user_id);

-- Add store_id column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Create index on store_id for expenses
CREATE INDEX IF NOT EXISTS ix_expenses_store_id ON expenses(store_id);
