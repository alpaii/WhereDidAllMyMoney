-- Migration: Refactor item_templates from JSONB to separate table
-- This migration creates a new maintenance_fee_item_templates table and links details to it

-- 1. Create new item_templates table
CREATE TABLE IF NOT EXISTS maintenance_fee_item_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_fee_id UUID NOT NULL REFERENCES maintenance_fees(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(maintenance_fee_id, name)
);

CREATE INDEX IF NOT EXISTS idx_item_templates_fee_id ON maintenance_fee_item_templates(maintenance_fee_id);

COMMENT ON TABLE maintenance_fee_item_templates IS '관리비 항목 템플릿';
COMMENT ON COLUMN maintenance_fee_item_templates.name IS '항목 이름';
COMMENT ON COLUMN maintenance_fee_item_templates.sort_order IS '정렬 순서';

-- 2. Migrate existing JSONB data to new table
INSERT INTO maintenance_fee_item_templates (maintenance_fee_id, name, sort_order)
SELECT
    mf.id,
    item_name,
    (row_number() OVER (PARTITION BY mf.id ORDER BY ordinality) - 1)::INTEGER
FROM maintenance_fees mf,
     jsonb_array_elements_text(COALESCE(mf.item_templates, '[]'::jsonb))
     WITH ORDINALITY AS t(item_name, ordinality)
WHERE mf.item_templates IS NOT NULL
  AND mf.item_templates != '[]'::jsonb
  AND jsonb_array_length(mf.item_templates) > 0
ON CONFLICT (maintenance_fee_id, name) DO NOTHING;

-- 3. Add item_template_id to maintenance_fee_details (CASCADE delete)
ALTER TABLE maintenance_fee_details
ADD COLUMN IF NOT EXISTS item_template_id UUID REFERENCES maintenance_fee_item_templates(id) ON DELETE CASCADE;

-- 4. Link existing details to templates by matching item_name
UPDATE maintenance_fee_details d
SET item_template_id = t.id
FROM maintenance_fee_item_templates t
JOIN maintenance_fee_records r ON r.id = d.record_id
WHERE t.maintenance_fee_id = r.maintenance_fee_id
  AND t.name = d.item_name
  AND d.item_template_id IS NULL;

-- 5. Drop item_name and category columns from maintenance_fee_details
ALTER TABLE maintenance_fee_details DROP COLUMN IF EXISTS item_name;
ALTER TABLE maintenance_fee_details DROP COLUMN IF EXISTS category;

-- 6. Remove item_templates JSONB column from maintenance_fees
ALTER TABLE maintenance_fees DROP COLUMN IF EXISTS item_templates;

-- 7. Create index for item_template_id
CREATE INDEX IF NOT EXISTS idx_details_item_template_id ON maintenance_fee_details(item_template_id);
