-- ========================================
-- 팔로잉 수 컬럼 추가
-- 생성일: 2024-01
-- ========================================

-- 시딩 인플루언서 테이블에 팔로잉 수 컬럼 추가
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 코멘트 추가
COMMENT ON COLUMN seeding_influencers.following_count IS '팔로잉 수 (시트에서 가져온 값)';
