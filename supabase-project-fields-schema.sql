-- ================================================
-- 프로젝트 필드 설정 테이블 스키마
-- 각 프로젝트 유형별 입력 필드를 동적으로 관리
-- ================================================

-- 프로젝트 필드 설정 테이블
CREATE TABLE IF NOT EXISTS public.project_field_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_type TEXT NOT NULL, -- 'sampling', 'detail_page', 'influencer', 'product_order', 'group_purchase', 'other'
  field_key TEXT NOT NULL, -- 필드 식별자 (예: 'brand', 'category', 'custom_field_1')
  field_label TEXT NOT NULL, -- 표시 이름 (예: '브랜드', '카테고리')
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'select', 'checkbox', 'date', 'textarea'
  field_options JSONB, -- select 타입일 경우 옵션 목록 (예: ["옵션1", "옵션2"])
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  placeholder TEXT, -- 입력 힌트
  default_value TEXT, -- 기본값
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, project_type, field_key)
);

-- RLS 비활성화
ALTER TABLE public.project_field_settings DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_field_settings_user_type
  ON public.project_field_settings(user_id, project_type);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS project_field_settings_updated_at ON public.project_field_settings;
CREATE TRIGGER project_field_settings_updated_at
  BEFORE UPDATE ON public.project_field_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_project_settings_updated_at();

-- 기본 필드 설정 함수 (새 사용자용)
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
