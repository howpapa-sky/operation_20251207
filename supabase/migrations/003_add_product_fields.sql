-- ========================================
-- 인플루언서별 제품 정보 컬럼 추가
-- 생성일: 2024-01
-- ========================================

-- 시딩 인플루언서 테이블에 제품 정보 컬럼 추가
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS product_price DECIMAL(10,2);

-- 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_product_name ON seeding_influencers(product_name);

-- 코멘트 추가
COMMENT ON COLUMN seeding_influencers.product_name IS '발송 제품명 (시트에서 가져온 값)';
COMMENT ON COLUMN seeding_influencers.product_price IS '제품 단가 (인플루언서별 개별 단가)';
