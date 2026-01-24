-- Migration: Add sort_order to accounts table

-- Add sort_order column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Set initial sort_order based on existing order (by created_at)
WITH ordered_accounts AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as new_order
    FROM accounts
)
UPDATE accounts a
SET sort_order = oa.new_order
FROM ordered_accounts oa
WHERE a.id = oa.id;
