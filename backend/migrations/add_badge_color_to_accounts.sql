-- Add badge_color column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS badge_color VARCHAR(7);
