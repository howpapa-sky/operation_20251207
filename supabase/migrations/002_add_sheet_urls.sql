-- ========================================
-- 시딩 프로젝트에 시트 URL 필드 추가
-- 생성일: 2024-01
-- ========================================

-- 리스트업 시트 정보
ALTER TABLE seeding_projects
ADD COLUMN IF NOT EXISTS listup_sheet_url TEXT,
ADD COLUMN IF NOT EXISTS listup_sheet_name VARCHAR(100) DEFAULT 'Sheet1';

-- 설문 응답 시트 정보
ALTER TABLE seeding_projects
ADD COLUMN IF NOT EXISTS survey_sheet_url TEXT,
ADD COLUMN IF NOT EXISTS survey_sheet_name VARCHAR(100) DEFAULT 'Form Responses 1';

-- 자동 동기화 설정
ALTER TABLE seeding_projects
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 코멘트 추가
COMMENT ON COLUMN seeding_projects.listup_sheet_url IS '인플루언서 리스트업 구글 스프레드시트 URL';
COMMENT ON COLUMN seeding_projects.listup_sheet_name IS '리스트업 시트명 (기본값: Sheet1)';
COMMENT ON COLUMN seeding_projects.survey_sheet_url IS '설문 응답 구글 스프레드시트 URL';
COMMENT ON COLUMN seeding_projects.survey_sheet_name IS '설문 응답 시트명 (기본값: Form Responses 1)';
COMMENT ON COLUMN seeding_projects.auto_sync_enabled IS '매일 자동 동기화 활성화 여부';
COMMENT ON COLUMN seeding_projects.last_synced_at IS '마지막 동기화 일시';
