-- =============================================
-- 시딩 마케팅비 연동을 위한 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 인플루언서 페이 (원고비 등 직접 지불 비용)
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS payment DECIMAL(10,2) DEFAULT 0;

-- 배송비
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;

-- 인덱스 (발송 날짜 기준 마케팅비 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_status_shipped
  ON seeding_influencers(status) WHERE status IN ('shipped', 'guide_sent', 'posted', 'completed');
