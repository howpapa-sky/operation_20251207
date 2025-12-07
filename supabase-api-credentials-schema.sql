-- ================================================
-- API 자격증명 테이블 스키마
-- 각 판매 채널(카페24, 네이버 스마트스토어, 쿠팡)의 API 인증 정보 저장
-- ================================================

-- API 자격증명 테이블
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL, -- 'cafe24', 'naver_smartstore', 'coupang'

  -- 공통 필드
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'never', -- 'never', 'syncing', 'success', 'failed'
  sync_error TEXT,

  -- 카페24 필드
  cafe24_mall_id TEXT,
  cafe24_client_id TEXT,
  cafe24_client_secret TEXT,
  cafe24_access_token TEXT,
  cafe24_refresh_token TEXT,
  cafe24_token_expires_at TIMESTAMPTZ,

  -- 네이버 스마트스토어 필드
  naver_client_id TEXT,
  naver_client_secret TEXT,
  naver_access_token TEXT,
  naver_refresh_token TEXT,
  naver_token_expires_at TIMESTAMPTZ,

  -- 쿠팡 필드
  coupang_vendor_id TEXT,
  coupang_access_key TEXT,
  coupang_secret_key TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 사용자당 채널별 하나의 자격증명만 허용
  UNIQUE(user_id, channel)
);

-- RLS 비활성화 (기존 테이블들과 동일하게)
ALTER TABLE public.api_credentials DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON public.api_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_channel ON public.api_credentials(channel);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS api_credentials_updated_at ON public.api_credentials;
CREATE TRIGGER api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_api_credentials_updated_at();

-- 동기화 이력 테이블 (선택사항 - 동기화 로그 저장)
CREATE TABLE IF NOT EXISTS public.api_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'manual', 'scheduled'
  status TEXT NOT NULL, -- 'started', 'success', 'failed'
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS 비활성화
ALTER TABLE public.api_sync_logs DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_user_id ON public.api_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_channel ON public.api_sync_logs(channel);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_started_at ON public.api_sync_logs(started_at DESC);
