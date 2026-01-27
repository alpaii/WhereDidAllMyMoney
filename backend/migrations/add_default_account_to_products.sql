-- Add default_account_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_products_default_account_id ON products(default_account_id);
