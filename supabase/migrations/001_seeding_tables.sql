-- ========================================
-- 인플루언서 시딩 테이블 마이그레이션
-- 생성일: 2024-01
-- ========================================

-- ========== 제품 가이드 테이블 (먼저 생성 - 참조됨) ==========
CREATE TABLE IF NOT EXISTS product_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nucio')),
  content_type VARCHAR(20) DEFAULT 'both' CHECK (content_type IN ('story', 'reels', 'feed', 'both')),

  -- 가이드 내용
  description TEXT,
  key_points TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  dos TEXT[] DEFAULT '{}',
  donts TEXT[] DEFAULT '{}',
  link_url TEXT,

  -- 첨부파일
  image_urls TEXT[] DEFAULT '{}',
  reference_urls TEXT[] DEFAULT '{}',

  -- 공개 링크
  public_slug VARCHAR(100) UNIQUE,
  is_public BOOLEAN DEFAULT false,

  -- 메타
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 시딩 프로젝트 테이블 ==========
CREATE TABLE IF NOT EXISTS seeding_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nucio')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200),

  -- 기간
  start_date DATE,
  end_date DATE,

  -- 목표
  target_count INTEGER DEFAULT 0,

  -- 비용 정보
  cost_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,

  -- 상태
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused')),

  -- 메타
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 시딩 인플루언서 테이블 ==========
CREATE TABLE IF NOT EXISTS seeding_influencers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES seeding_projects(id) ON DELETE CASCADE,

  -- 계정 정보
  account_id VARCHAR(100) NOT NULL,
  account_name VARCHAR(200),
  platform VARCHAR(20) DEFAULT 'instagram' CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'blog')),
  email VARCHAR(200),
  phone VARCHAR(50),
  follower_count INTEGER DEFAULT 0,
  category VARCHAR(100),
  profile_url TEXT,

  -- 시딩 정보
  seeding_type VARCHAR(10) DEFAULT 'free' CHECK (seeding_type IN ('free', 'paid')),
  content_type VARCHAR(20) DEFAULT 'story' CHECK (content_type IN ('story', 'reels', 'feed', 'both')),
  fee DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'listed' CHECK (status IN ('listed', 'contacted', 'accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed')),

  -- 배송 정보 (JSONB)
  shipping JSONB DEFAULT '{
    "recipient_name": "",
    "phone": "",
    "address": "",
    "postal_code": "",
    "quantity": 1,
    "carrier": "",
    "tracking_number": "",
    "shipped_at": null,
    "delivered_at": null
  }'::jsonb,

  -- 가이드 정보
  guide_id UUID REFERENCES product_guides(id) ON DELETE SET NULL,
  guide_sent_at TIMESTAMPTZ,
  guide_link TEXT,

  -- 포스팅 정보
  posting_url TEXT,
  posted_at TIMESTAMPTZ,

  -- 성과 정보 (JSONB)
  performance JSONB DEFAULT '{
    "views": null,
    "likes": null,
    "comments": null,
    "saves": null,
    "shares": null,
    "story_views": null,
    "link_clicks": null,
    "screenshot_urls": [],
    "measured_at": null
  }'::jsonb,

  -- 진행 일시
  contacted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  completed_at TIMESTAMPTZ,

  -- 메타
  notes TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sheet_row_index INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 섭외 문구 템플릿 테이블 ==========
CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  seeding_type VARCHAR(10) DEFAULT 'all' CHECK (seeding_type IN ('free', 'paid', 'all')),
  content_type VARCHAR(20) DEFAULT 'all' CHECK (content_type IN ('story', 'reels', 'feed', 'both', 'all')),
  brand VARCHAR(20) DEFAULT 'all' CHECK (brand IN ('howpapa', 'nucio', 'all')),
  variables TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 인덱스 생성 ==========
CREATE INDEX IF NOT EXISTS idx_seeding_projects_brand ON seeding_projects(brand);
CREATE INDEX IF NOT EXISTS idx_seeding_projects_status ON seeding_projects(status);
CREATE INDEX IF NOT EXISTS idx_seeding_projects_product ON seeding_projects(product_id);
CREATE INDEX IF NOT EXISTS idx_seeding_projects_dates ON seeding_projects(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_seeding_influencers_project ON seeding_influencers(project_id);
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_status ON seeding_influencers(status);
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_platform ON seeding_influencers(platform);
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_seeding_type ON seeding_influencers(seeding_type);
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_content_type ON seeding_influencers(content_type);
CREATE INDEX IF NOT EXISTS idx_seeding_influencers_account ON seeding_influencers(account_id);

CREATE INDEX IF NOT EXISTS idx_product_guides_slug ON product_guides(public_slug);
CREATE INDEX IF NOT EXISTS idx_product_guides_brand ON product_guides(brand);
CREATE INDEX IF NOT EXISTS idx_product_guides_product ON product_guides(product_id);

CREATE INDEX IF NOT EXISTS idx_outreach_templates_brand ON outreach_templates(brand);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_type ON outreach_templates(seeding_type, content_type);

-- ========== RLS (Row Level Security) 정책 ==========
ALTER TABLE seeding_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeding_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_guides ENABLE ROW LEVEL SECURITY;

-- 시딩 프로젝트: 인증된 사용자 전체 접근
CREATE POLICY "seeding_projects_authenticated_access" ON seeding_projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 시딩 인플루언서: 인증된 사용자 전체 접근
CREATE POLICY "seeding_influencers_authenticated_access" ON seeding_influencers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 섭외 문구 템플릿: 인증된 사용자 전체 접근
CREATE POLICY "outreach_templates_authenticated_access" ON outreach_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 제품 가이드: 인증된 사용자 전체 접근
CREATE POLICY "product_guides_authenticated_access" ON product_guides
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 제품 가이드: 공개 페이지 읽기 허용 (비인증 사용자도)
CREATE POLICY "product_guides_public_read" ON product_guides
  FOR SELECT
  TO anon
  USING (is_public = true);

-- ========== Updated_at 트리거 ==========
-- 트리거 함수 (이미 존재하지 않는 경우에만 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS seeding_projects_updated_at ON seeding_projects;
CREATE TRIGGER seeding_projects_updated_at
  BEFORE UPDATE ON seeding_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS seeding_influencers_updated_at ON seeding_influencers;
CREATE TRIGGER seeding_influencers_updated_at
  BEFORE UPDATE ON seeding_influencers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS outreach_templates_updated_at ON outreach_templates;
CREATE TRIGGER outreach_templates_updated_at
  BEFORE UPDATE ON outreach_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS product_guides_updated_at ON product_guides;
CREATE TRIGGER product_guides_updated_at
  BEFORE UPDATE ON product_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== 초기 섭외 문구 템플릿 데이터 ==========
INSERT INTO outreach_templates (name, content, seeding_type, content_type, brand, variables) VALUES
(
  '무가 스토리 기본 섭외문',
  '안녕하세요 {{이름}}님! 🌿

하우파파/누씨오 담당자입니다.
{{이름}}님의 인스타그램을 보고 연락드리게 되었어요.

저희 {{제품명}} 제품을 체험해보시고
인스타그램 스토리에 솔직한 후기를 남겨주실 수 있으실까요?

✅ 제공: {{제품명}} 1개
✅ 요청: 인스타그램 스토리 1회 (링크 포함)
✅ 기한: 제품 수령 후 2주 내

관심 있으시면 답변 부탁드려요! 😊',
  'free',
  'story',
  'all',
  ARRAY['{{이름}}', '{{제품명}}']
),
(
  '유가 릴스 기본 섭외문',
  '안녕하세요 {{이름}}님! 🌿

하우파파/누씨오 담당자입니다.
{{이름}}님의 콘텐츠를 정말 인상 깊게 보았습니다.

저희 {{제품명}} 제품 릴스 콘텐츠 협업을 제안드리고 싶습니다.

✅ 제공: {{제품명}} 1개 + 원고비 {{원고비}}원
✅ 요청: 인스타그램 릴스 1회 (15~30초)
✅ 기한: 제품 수령 후 3주 내

상세 가이드는 협업 확정 후 전달드리겠습니다.
관심 있으시면 답변 부탁드려요! 😊',
  'paid',
  'reels',
  'all',
  ARRAY['{{이름}}', '{{제품명}}', '{{원고비}}']
);

-- ========== 뷰: 시딩 프로젝트 통계 ==========
CREATE OR REPLACE VIEW seeding_project_stats AS
SELECT
  sp.id as project_id,
  sp.name as project_name,
  sp.brand,
  sp.product_name,
  sp.target_count,
  sp.cost_price,
  sp.selling_price,
  sp.status as project_status,
  COUNT(si.id) as total_influencers,
  COUNT(CASE WHEN si.status = 'listed' THEN 1 END) as listed_count,
  COUNT(CASE WHEN si.status = 'contacted' THEN 1 END) as contacted_count,
  COUNT(CASE WHEN si.status = 'accepted' THEN 1 END) as accepted_count,
  COUNT(CASE WHEN si.status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN si.status = 'shipped' THEN 1 END) as shipped_count,
  COUNT(CASE WHEN si.status = 'guide_sent' THEN 1 END) as guide_sent_count,
  COUNT(CASE WHEN si.status = 'posted' THEN 1 END) as posted_count,
  COUNT(CASE WHEN si.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN si.seeding_type = 'free' THEN 1 END) as free_count,
  COUNT(CASE WHEN si.seeding_type = 'paid' THEN 1 END) as paid_count,
  COALESCE(SUM(si.fee), 0) as total_fee,
  COALESCE(SUM((si.shipping->>'quantity')::int), 0) as total_quantity,
  COALESCE(SUM((si.shipping->>'quantity')::int * sp.cost_price), 0) as total_cost,
  COALESCE(SUM((si.shipping->>'quantity')::int * sp.selling_price), 0) as total_value,
  COALESCE(SUM((si.performance->>'views')::int), 0) as total_views,
  COALESCE(SUM(
    COALESCE((si.performance->>'likes')::int, 0) +
    COALESCE((si.performance->>'comments')::int, 0) +
    COALESCE((si.performance->>'saves')::int, 0) +
    COALESCE((si.performance->>'shares')::int, 0)
  ), 0) as total_engagement
FROM seeding_projects sp
LEFT JOIN seeding_influencers si ON sp.id = si.project_id
GROUP BY sp.id, sp.name, sp.brand, sp.product_name, sp.target_count,
         sp.cost_price, sp.selling_price, sp.status;

-- ========== 코멘트 추가 ==========
COMMENT ON TABLE seeding_projects IS '시딩 프로젝트 - 제품+기간 단위의 시딩 캠페인';
COMMENT ON TABLE seeding_influencers IS '시딩 인플루언서 - 개별 인플루언서 시딩 관리';
COMMENT ON TABLE outreach_templates IS '섭외 문구 템플릿 - 인플루언서 연락용 템플릿';
COMMENT ON TABLE product_guides IS '제품 가이드 - 인플루언서에게 전달할 콘텐츠 가이드';

COMMENT ON COLUMN seeding_influencers.shipping IS 'JSON: recipient_name, phone, address, postal_code, quantity, carrier, tracking_number, shipped_at, delivered_at';
COMMENT ON COLUMN seeding_influencers.performance IS 'JSON: views, likes, comments, saves, shares, story_views, link_clicks, screenshot_urls, measured_at';
