-- =============================================
-- 자동 이상 알림 설정 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sales_drop_threshold INTEGER DEFAULT 30,       -- 매출 하락 임계값 (%)
  roas_target INTEGER DEFAULT 300,               -- ROAS 목표값 (%)
  low_stock_alert BOOLEAN DEFAULT true,
  notification_email TEXT,
  notification_naver_works BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS 비활성화 (설정 테이블)
ALTER TABLE public.alert_settings DISABLE ROW LEVEL SECURITY;

-- updated_at 트리거
DROP TRIGGER IF EXISTS alert_settings_updated_at ON public.alert_settings;
CREATE TRIGGER alert_settings_updated_at
  BEFORE UPDATE ON public.alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- products 테이블에 안전재고 컬럼 추가 (재고 부족 알림용)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS safety_stock INTEGER DEFAULT 0;
