-- 관리비 장소 테이블
CREATE TABLE IF NOT EXISTS maintenance_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(500),
    memo TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_fees_user_id ON maintenance_fees(user_id);

-- 월별 관리비 기록 테이블
CREATE TABLE IF NOT EXISTS maintenance_fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_fee_id UUID NOT NULL REFERENCES maintenance_fees(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL,  -- 형식: "2025-11"
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    due_date DATE,
    paid_date DATE,
    is_paid BOOLEAN DEFAULT FALSE,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_fee_records_maintenance_fee_id ON maintenance_fee_records(maintenance_fee_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_fee_records_year_month ON maintenance_fee_records(year_month);

-- 중복 방지: 같은 장소의 같은 월에 하나의 기록만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_fee_records_unique_month
    ON maintenance_fee_records(maintenance_fee_id, year_month);

-- 관리비 상세 항목 테이블
CREATE TABLE IF NOT EXISTS maintenance_fee_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES maintenance_fee_records(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,  -- 관리비, 에너지, 기타
    item_name VARCHAR(100) NOT NULL,  -- 일반관리비, 전기료 등
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    usage_amount NUMERIC(15, 2),  -- 사용량 (241 kWh 등)
    usage_unit VARCHAR(20),  -- 단위 (kWh, ㎥, MJ 등)
    is_vat_included BOOLEAN DEFAULT TRUE,  -- 부가세 포함 여부
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_fee_details_record_id ON maintenance_fee_details(record_id);
