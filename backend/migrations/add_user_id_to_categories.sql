-- Migration: Add user_id to categories table
-- Run this migration manually before starting the backend

-- Step 1: Add user_id column (nullable initially)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 2: Create index for user_id
CREATE INDEX IF NOT EXISTS ix_categories_user_id ON categories(user_id);

-- Step 3: Add foreign key constraint
ALTER TABLE categories
    DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE categories
    ADD CONSTRAINT categories_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Assign existing categories to a specific user
-- This assigns all existing categories to the first user found
-- Modify the WHERE clause if you want to assign to a different user
UPDATE categories
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

-- Note: After this migration, each user can create their own categories.
-- Existing categories are now owned by the first user.
