-- =============================================
-- HOWPAPA 프로젝트 관리 시스템 - 통합 SQL 스키마
-- Supabase SQL Editor에서 한 번에 실행하세요
-- =============================================

-- =============================================
-- 1. 기본 테이블
-- =============================================

-- 프로필 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'manager', 'member')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sampling', 'detail_page', 'influencer', 'product_order', 'group_purchase', 'other')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  completed_date DATE,
  assignee TEXT,
  notes TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 평가 항목 테이블
CREATE TABLE IF NOT EXISTS public.evaluation_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  max_score INT DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. 매출 관리 테이블
-- =============================================

-- 제품 테이블
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT NOT NULL,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 매출 기록 테이블
CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  channel TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
  profit NUMERIC(12, 2) GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * cost_price)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. API 연동 테이블
-- =============================================

-- API 자격증명 테이블
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'never',
  sync_error TEXT,
  cafe24_mall_id TEXT,
  cafe24_client_id TEXT,
  cafe24_client_secret TEXT,
  cafe24_access_token TEXT,
  cafe24_refresh_token TEXT,
  cafe24_token_expires_at TIMESTAMPTZ,
  naver_client_id TEXT,
  naver_client_secret TEXT,
  naver_access_token TEXT,
  naver_refresh_token TEXT,
  naver_token_expires_at TIMESTAMPTZ,
  coupang_vendor_id TEXT,
  coupang_access_key TEXT,
  coupang_secret_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- API 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS public.api_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- 4. 프로젝트 설정 테이블
-- =============================================

-- 프로젝트 유형 설정 테이블
CREATE TABLE IF NOT EXISTS public.project_type_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_type TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  custom_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_type)
);

-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dday_email_enabled BOOLEAN DEFAULT false,
  dday_days_before INTEGER[] DEFAULT '{3, 1, 0}',
  dday_overdue_enabled BOOLEAN DEFAULT false,
  status_change_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT false,
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 프로젝트 필드 설정 테이블
CREATE TABLE IF NOT EXISTS public.project_field_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  placeholder TEXT,
  default_value TEXT,
  visible_for_brands JSONB, -- 특정 브랜드에서만 표시 (null = 모든 브랜드)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_type, field_key)
);

-- =============================================
-- 5. RLS (Row Level Security) 설정
-- =============================================
-- 모든 인증된 사용자가 데이터를 공유하도록 설정

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- RLS 비활성화 (단순 설정 테이블)
ALTER TABLE public.api_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_type_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_field_settings DISABLE ROW LEVEL SECURITY;

-- profiles 정책 (프로필은 개인별 유지)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- projects 정책 (모든 인증된 사용자가 공유)
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view all projects" ON public.projects;
CREATE POLICY "Authenticated users can view all projects" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update all projects" ON public.projects;
CREATE POLICY "Authenticated users can update all projects" ON public.projects FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete all projects" ON public.projects;
CREATE POLICY "Authenticated users can delete all projects" ON public.projects FOR DELETE USING (auth.uid() IS NOT NULL);

-- evaluation_criteria 정책 (모든 인증된 사용자가 공유)
DROP POLICY IF EXISTS "Users can view own criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Authenticated users can view all criteria" ON public.evaluation_criteria;
CREATE POLICY "Authenticated users can view all criteria" ON public.evaluation_criteria FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can create own criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Authenticated users can create criteria" ON public.evaluation_criteria;
CREATE POLICY "Authenticated users can create criteria" ON public.evaluation_criteria FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Authenticated users can update all criteria" ON public.evaluation_criteria;
CREATE POLICY "Authenticated users can update all criteria" ON public.evaluation_criteria FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Authenticated users can delete all criteria" ON public.evaluation_criteria;
CREATE POLICY "Authenticated users can delete all criteria" ON public.evaluation_criteria FOR DELETE USING (auth.uid() IS NOT NULL);

-- products 정책 (모든 인증된 사용자가 공유)
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;
CREATE POLICY "Authenticated users can view all products" ON public.products FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can create own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
CREATE POLICY "Authenticated users can create products" ON public.products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update all products" ON public.products;
CREATE POLICY "Authenticated users can update all products" ON public.products FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete all products" ON public.products;
CREATE POLICY "Authenticated users can delete all products" ON public.products FOR DELETE USING (auth.uid() IS NOT NULL);

-- sales_records 정책 (모든 인증된 사용자가 공유)
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales_records;
DROP POLICY IF EXISTS "Authenticated users can view all sales" ON public.sales_records;
CREATE POLICY "Authenticated users can view all sales" ON public.sales_records FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can create own sales" ON public.sales_records;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales_records;
CREATE POLICY "Authenticated users can create sales" ON public.sales_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales_records;
DROP POLICY IF EXISTS "Authenticated users can update all sales" ON public.sales_records;
CREATE POLICY "Authenticated users can update all sales" ON public.sales_records FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales_records;
DROP POLICY IF EXISTS "Authenticated users can delete all sales" ON public.sales_records;
CREATE POLICY "Authenticated users can delete all sales" ON public.sales_records FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 6. 인덱스
-- =============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_user_id ON public.evaluation_criteria(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_category ON public.evaluation_criteria(category);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON public.sales_records(date);
CREATE INDEX IF NOT EXISTS idx_sales_records_channel ON public.sales_records(channel);
CREATE INDEX IF NOT EXISTS idx_sales_records_user_date ON public.sales_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON public.api_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_channel ON public.api_credentials(channel);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_user_id ON public.api_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_channel ON public.api_sync_logs(channel);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_started_at ON public.api_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_type_settings_user_id ON public.project_type_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_project_field_settings_user_type ON public.project_field_settings(user_id, project_type);

-- =============================================
-- 7. 트리거 함수
-- =============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 설정용 updated_at 함수
CREATE OR REPLACE FUNCTION update_project_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- API 자격증명용 updated_at 함수
CREATE OR REPLACE FUNCTION update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. 트리거 설정
-- =============================================

DROP TRIGGER IF EXISTS on_projects_updated ON public.projects;
CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS api_credentials_updated_at ON public.api_credentials;
CREATE TRIGGER api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW EXECUTE FUNCTION update_api_credentials_updated_at();

DROP TRIGGER IF EXISTS project_type_settings_updated_at ON public.project_type_settings;
CREATE TRIGGER project_type_settings_updated_at
  BEFORE UPDATE ON public.project_type_settings
  FOR EACH ROW EXECUTE FUNCTION update_project_settings_updated_at();

DROP TRIGGER IF EXISTS notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_project_settings_updated_at();

DROP TRIGGER IF EXISTS project_field_settings_updated_at ON public.project_field_settings;
CREATE TRIGGER project_field_settings_updated_at
  BEFORE UPDATE ON public.project_field_settings
  FOR EACH ROW EXECUTE FUNCTION update_project_settings_updated_at();

-- =============================================
-- 9. 회원가입 시 프로필 자동 생성
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 10. 기본 데이터 생성 함수
-- =============================================

-- 기본 평가 항목 생성 함수
CREATE OR REPLACE FUNCTION public.create_default_criteria(p_user_id UUID)
RETURNS void AS $$
DECLARE
  categories TEXT[] := ARRAY['크림', '패드', '로션', '앰플', '세럼', '미스트'];
  cat TEXT;
BEGIN
  FOREACH cat IN ARRAY categories
  LOOP
    INSERT INTO public.evaluation_criteria (user_id, name, description, category, max_score, is_active)
    VALUES
      (p_user_id, '발림성', '제품이 피부에 잘 발리는 정도', cat, 5, true),
      (p_user_id, '흡수력', '피부에 흡수되는 속도와 정도', cat, 5, true),
      (p_user_id, '보습력', '보습 지속 효과', cat, 5, true),
      (p_user_id, '향', '향의 적절성과 지속성', cat, 5, true),
      (p_user_id, '제형', '제형의 적절성', cat, 5, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기본 프로젝트 필드 생성 함수
CREATE OR REPLACE FUNCTION create_default_project_fields(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- 샘플링 기본 필드
  INSERT INTO public.project_field_settings (user_id, project_type, field_key, field_label, field_type, field_options, is_required, display_order)
  VALUES
    (p_user_id, 'sampling', 'brand', '브랜드', 'select', '["howpapa", "nuccio"]', true, 1),
    (p_user_id, 'sampling', 'category', '카테고리', 'select', '["크림", "패드", "로션", "스틱", "앰플", "세럼", "미스트", "클렌저", "선크림", "마스크팩", "기타"]', true, 2),
    (p_user_id, 'sampling', 'manufacturer', '제조사', 'select', '["콜마", "코스맥스", "기타"]', true, 3),
    (p_user_id, 'sampling', 'sampleCode', '샘플 코드', 'text', NULL, false, 4),
    (p_user_id, 'sampling', 'round', '회차', 'number', NULL, false, 5)
  ON CONFLICT (user_id, project_type, field_key) DO NOTHING;

  -- 상세페이지 제작 기본 필드
  INSERT INTO public.project_field_settings (user_id, project_type, field_key, field_label, field_type, field_options, is_required, display_order)
  VALUES
    (p_user_id, 'detail_page', 'brand', '브랜드', 'select', '["howpapa", "nuccio"]', true, 1),
    (p_user_id, 'detail_page', 'category', '카테고리', 'select', '["크림", "패드", "로션", "스틱", "앰플", "세럼", "미스트", "클렌저", "선크림", "마스크팩", "기타"]', true, 2),
    (p_user_id, 'detail_page', 'productName', '제품명', 'text', NULL, false, 3),
    (p_user_id, 'detail_page', 'productionCompany', '제작 업체', 'text', NULL, false, 4),
    (p_user_id, 'detail_page', 'workType', '업무 구분', 'select', '["new", "renewal"]', false, 5),
    (p_user_id, 'detail_page', 'budget', '예산', 'number', NULL, false, 6),
    (p_user_id, 'detail_page', 'includesPhotography', '촬영 포함', 'checkbox', NULL, false, 7),
    (p_user_id, 'detail_page', 'includesPlanning', '기획 포함', 'checkbox', NULL, false, 8)
  ON CONFLICT (user_id, project_type, field_key) DO NOTHING;

  -- 인플루언서 협업 기본 필드
  INSERT INTO public.project_field_settings (user_id, project_type, field_key, field_label, field_type, field_options, is_required, display_order)
  VALUES
    (p_user_id, 'influencer', 'collaborationType', '협업 유형', 'select', '["sponsorship", "paid_content"]', true, 1),
    (p_user_id, 'influencer', 'influencerName', '인플루언서', 'text', NULL, false, 2),
    (p_user_id, 'influencer', 'platform', '플랫폼', 'text', NULL, false, 3),
    (p_user_id, 'influencer', 'budget', '예산', 'number', NULL, false, 4)
  ON CONFLICT (user_id, project_type, field_key) DO NOTHING;

  -- 제품 발주 기본 필드
  INSERT INTO public.project_field_settings (user_id, project_type, field_key, field_label, field_type, field_options, is_required, display_order)
  VALUES
    (p_user_id, 'product_order', 'brand', '브랜드', 'select', '["howpapa", "nuccio"]', true, 1),
    (p_user_id, 'product_order', 'manufacturer', '제조사', 'select', '["콜마", "코스맥스", "기타"]', true, 2),
    (p_user_id, 'product_order', 'containerMaterial', '용기 부자재', 'text', NULL, false, 3),
    (p_user_id, 'product_order', 'boxMaterial', '단상자 부자재', 'text', NULL, false, 4),
    (p_user_id, 'product_order', 'quantity', '수량', 'number', NULL, false, 5),
    (p_user_id, 'product_order', 'unitPrice', '단가', 'number', NULL, false, 6)
  ON CONFLICT (user_id, project_type, field_key) DO NOTHING;

  -- 공동구매 기본 필드
  INSERT INTO public.project_field_settings (user_id, project_type, field_key, field_label, field_type, field_options, is_required, display_order)
  VALUES
    (p_user_id, 'group_purchase', 'brand', '브랜드', 'select', '["howpapa", "nuccio"]', true, 1),
    (p_user_id, 'group_purchase', 'sellerName', '셀러', 'text', NULL, false, 2),
    (p_user_id, 'group_purchase', 'revenue', '매출', 'number', NULL, false, 3),
    (p_user_id, 'group_purchase', 'contributionProfit', '공헌 이익', 'number', NULL, false, 4)
  ON CONFLICT (user_id, project_type, field_key) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. 최고 관리자 설정
-- =============================================

-- yong@howlab.co.kr을 최고 관리자로 설정
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'yong@howlab.co.kr';

-- =============================================
-- 완료!
-- =============================================
