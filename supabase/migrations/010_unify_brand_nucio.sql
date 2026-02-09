-- ================================================================
-- 브랜드명 통일: nuccio → nucio
-- 실행일: 2026-02-09
-- 설명: 전체 DB에서 'nuccio' → 'nucio' 통일
--       (이미 'nucio'인 데이터는 영향 없음)
-- ================================================================

-- ===============================
-- 1. brands 테이블 (마스터)
-- ===============================
UPDATE brands SET code = 'nucio' WHERE code = 'nuccio';
UPDATE brands SET display_name = 'NUCIO' WHERE display_name = 'NUCCIO';
-- name(한글)은 '누씨오'로 유지 (한글 표기는 변경 불필요)

-- ===============================
-- 2. 직접 brand 컬럼이 있는 테이블들 (데이터 UPDATE)
-- ===============================

-- product_guides
UPDATE product_guides SET brand = 'nucio' WHERE brand = 'nuccio';

-- seeding_projects
UPDATE seeding_projects SET brand = 'nucio' WHERE brand = 'nuccio';

-- outreach_templates
UPDATE outreach_templates SET brand = 'nucio' WHERE brand = 'nuccio';

-- sku_master
UPDATE sku_master SET brand = 'nucio' WHERE brand = 'nuccio';

-- daily_channel_stats
UPDATE daily_channel_stats SET brand = 'nucio' WHERE brand = 'nuccio';

-- group_purchase_rounds
UPDATE group_purchase_rounds SET brand = 'nucio' WHERE brand = 'nuccio';

-- dev_requests (CHECK 제약조건 없음, VARCHAR)
UPDATE dev_requests SET brand = 'nucio' WHERE brand = 'nuccio';

-- products (brand TEXT 컬럼, CHECK 없음)
UPDATE products SET brand = 'nucio' WHERE brand = 'nuccio';

-- ===============================
-- 3. CHECK 제약조건 변경
--    (이미 'nucio'로 되어 있으면 에러 없이 스킵됨)
-- ===============================

-- product_guides: brand CHECK
DO $$
BEGIN
  -- 기존 CHECK 제약조건 삭제 (이름이 자동 생성되므로 테이블에서 찾기)
  EXECUTE (
    SELECT 'ALTER TABLE product_guides DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'product_guides'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE product_guides ADD CONSTRAINT product_guides_brand_check
  CHECK (brand IN ('howpapa', 'nucio'));

-- seeding_projects: brand CHECK
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE seeding_projects DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'seeding_projects'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE seeding_projects ADD CONSTRAINT seeding_projects_brand_check
  CHECK (brand IN ('howpapa', 'nucio'));

-- outreach_templates: brand CHECK
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE outreach_templates DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'outreach_templates'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE outreach_templates ADD CONSTRAINT outreach_templates_brand_check
  CHECK (brand IN ('howpapa', 'nucio', 'all'));

-- sku_master: brand CHECK
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE sku_master DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'sku_master'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE sku_master ADD CONSTRAINT sku_master_brand_check
  CHECK (brand IN ('howpapa', 'nucio'));

-- group_purchase_rounds: brand CHECK
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE group_purchase_rounds DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'group_purchase_rounds'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%brand%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE group_purchase_rounds ADD CONSTRAINT group_purchase_rounds_brand_check
  CHECK (brand IN ('howpapa', 'nucio'));

-- ===============================
-- 4. project_field_settings JSONB 데이터
--    (field_options에 "nuccio"가 있으면 "nucio"로 변경)
-- ===============================
UPDATE project_field_settings
SET field_options = REPLACE(field_options::text, '"nuccio"', '"nucio"')::jsonb
WHERE field_key = 'brand'
  AND field_options::text LIKE '%nuccio%';

-- ===============================
-- 5. 함수 내 기본값 업데이트
--    create_default_project_fields() 함수에 'nuccio'가 하드코딩되어 있을 수 있음
--    → 함수 재생성은 별도 처리 필요 (아래는 데이터만 처리)
-- ===============================

-- 확인용 쿼리 (실행 후 결과 확인)
-- SELECT table_name, column_name, count(*)
-- FROM (
--   SELECT 'brands' as table_name, 'code' as column_name FROM brands WHERE code = 'nuccio'
--   UNION ALL SELECT 'product_guides', 'brand' FROM product_guides WHERE brand = 'nuccio'
--   UNION ALL SELECT 'seeding_projects', 'brand' FROM seeding_projects WHERE brand = 'nuccio'
--   UNION ALL SELECT 'sku_master', 'brand' FROM sku_master WHERE brand = 'nuccio'
--   UNION ALL SELECT 'dev_requests', 'brand' FROM dev_requests WHERE brand = 'nuccio'
--   UNION ALL SELECT 'outreach_templates', 'brand' FROM outreach_templates WHERE brand = 'nuccio'
--   UNION ALL SELECT 'group_purchase_rounds', 'brand' FROM group_purchase_rounds WHERE brand = 'nuccio'
-- ) t
-- GROUP BY table_name, column_name;
-- → 결과가 0건이면 정상 완료
