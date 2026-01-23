-- ========================================
-- 프로젝트별 Google Sheets 동기화 설정 추가
-- 생성일: 2024-01
-- ========================================

-- 시딩 프로젝트 테이블에 시트 연동 설정 추가
ALTER TABLE seeding_projects
  ADD COLUMN IF NOT EXISTS listup_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS listup_sheet_name VARCHAR(100) DEFAULT 'Sheet1',
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 코멘트 추가
COMMENT ON COLUMN seeding_projects.listup_sheet_url IS 'Google Sheets URL for import';
COMMENT ON COLUMN seeding_projects.listup_sheet_name IS 'Sheet name (tab) to import from';
COMMENT ON COLUMN seeding_projects.auto_sync_enabled IS 'Enable automatic daily sync at 9 AM KST';
COMMENT ON COLUMN seeding_projects.last_synced_at IS 'Last successful sync timestamp';
