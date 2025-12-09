-- ================================================
-- 프로젝트 설정 테이블 스키마
-- 프로젝트 유형별 표시 설정 및 커스텀 필드 관리
-- ================================================

-- 프로젝트 유형 설정 테이블
CREATE TABLE IF NOT EXISTS public.project_type_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_type TEXT NOT NULL, -- 'sampling', 'detail_page', 'influencer', 'product_order', 'group_purchase', 'other'
  is_visible BOOLEAN DEFAULT true, -- 메뉴 노출 여부
  display_order INTEGER DEFAULT 0, -- 표시 순서
  custom_name TEXT, -- 사용자 지정 이름 (선택)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, project_type)
);

-- RLS 비활성화
ALTER TABLE public.project_type_settings DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_type_settings_user_id ON public.project_type_settings(user_id);

-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- D-DAY 알림 설정
  dday_email_enabled BOOLEAN DEFAULT false,
  dday_days_before INTEGER[] DEFAULT '{3, 1, 0}', -- D-3, D-1, D-DAY에 알림
  dday_overdue_enabled BOOLEAN DEFAULT false, -- 마감일 지난 프로젝트 알림

  -- 기타 알림 설정
  status_change_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT false,

  -- 이메일 주소 (별도 지정 시)
  notification_email TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- RLS 비활성화
ALTER TABLE public.notification_settings DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_project_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_type_settings_updated_at ON public.project_type_settings;
CREATE TRIGGER project_type_settings_updated_at
  BEFORE UPDATE ON public.project_type_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_project_settings_updated_at();

DROP TRIGGER IF EXISTS notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_project_settings_updated_at();
