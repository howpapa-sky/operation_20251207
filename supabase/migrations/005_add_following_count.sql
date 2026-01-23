-- ========================================
-- 팔로잉 수, 날짜 컬럼 추가
-- 생성일: 2024-01
-- ========================================

-- 시딩 인플루언서 테이블에 팔로잉 수 컬럼 추가
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 시딩 인플루언서 테이블에 리스트업 날짜 컬럼 추가
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS listed_at DATE;

-- 코멘트 추가
COMMENT ON COLUMN seeding_influencers.following_count IS '팔로잉 수 (시트에서 가져온 값)';
COMMENT ON COLUMN seeding_influencers.listed_at IS '리스트업 날짜 (시트의 Date 컬럼)';
