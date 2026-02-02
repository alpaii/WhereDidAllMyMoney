-- Add item_templates column to maintenance_fees table
-- This column stores the list of item template names as JSONB

ALTER TABLE maintenance_fees
ADD COLUMN IF NOT EXISTS item_templates JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN maintenance_fees.item_templates IS '관리비 항목 이름 템플릿 목록';
