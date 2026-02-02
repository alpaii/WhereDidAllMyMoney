-- 마이그레이션: 기존 records에 대해 템플릿 기반으로 상세 항목 생성
-- 이 스크립트는 기존의 월별 기록(records)에 대해
-- 해당 장소의 항목 템플릿을 기반으로 상세 항목(details)을 자동 생성합니다.

-- 1. 기존에 details가 없는 records에 대해 템플릿 기반으로 details 추가
INSERT INTO maintenance_fee_details (id, record_id, item_template_id, amount, is_vat_included, sort_order, created_at)
SELECT
    gen_random_uuid(),
    r.id,
    t.id,
    0,
    true,
    t.sort_order,
    NOW()
FROM maintenance_fee_records r
JOIN maintenance_fee_item_templates t ON t.maintenance_fee_id = r.maintenance_fee_id
WHERE NOT EXISTS (
    SELECT 1 FROM maintenance_fee_details d
    WHERE d.record_id = r.id AND d.item_template_id = t.id
);

-- 2. 기존 details의 sort_order를 템플릿의 sort_order와 동기화
UPDATE maintenance_fee_details d
SET sort_order = t.sort_order
FROM maintenance_fee_item_templates t
WHERE d.item_template_id = t.id;
