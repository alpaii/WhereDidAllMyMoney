-- Migration: Add sort_order to categories and subcategories tables

-- Add sort_order column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Add sort_order column to subcategories
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Set initial sort_order based on existing order (alphabetical by name)
WITH ordered_categories AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) - 1 as new_order
    FROM categories
)
UPDATE categories c
SET sort_order = oc.new_order
FROM ordered_categories oc
WHERE c.id = oc.id;

WITH ordered_subcategories AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY name) - 1 as new_order
    FROM subcategories
)
UPDATE subcategories s
SET sort_order = os.new_order
FROM ordered_subcategories os
WHERE s.id = os.id;
