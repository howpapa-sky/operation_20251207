-- seeding_influencers 테이블에 새 컬럼 추가
ALTER TABLE seeding_influencers
  ADD COLUMN IF NOT EXISTS following_count INTEGER,
  ADD COLUMN IF NOT EXISTS listed_at DATE;
