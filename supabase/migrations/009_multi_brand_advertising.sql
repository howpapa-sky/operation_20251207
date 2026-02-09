-- 멀티 브랜드 + 광고 API 연동 스키마
-- 2026-02-06
-- 기존 연동에 영향 없이 하위호환성 유지

-- =====================================================
-- 1. 브랜드 마스터 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,           -- 'howpapa', 'nucio'
  name VARCHAR(100) NOT NULL,                 -- '하우파파', '누치오'
  display_name VARCHAR(100),                  -- 표시명
  primary_color VARCHAR(20),                  -- 브랜드 컬러 (#f97316, #22c55e)
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',                -- 브랜드별 설정
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 브랜드 삽입
INSERT INTO brands (code, name, display_name, primary_color) VALUES
  ('howpapa', '하우파파', 'HOWPAPA', '#f97316'),
  ('nucio', '누치오', 'NUCIO', '#22c55e')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. 광고 계정 테이블 (플랫폼별 인증정보)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,              -- 'naver_sa', 'naver_gfa', 'meta', 'coupang_ads'
  account_name VARCHAR(200),                  -- 계정 표시명
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'never',    -- never, syncing, success, failed
  sync_error TEXT,

  -- 네이버 검색광고 (SA) 자격증명
  naver_customer_id VARCHAR(100),             -- 광고주 ID
  naver_api_key VARCHAR(200),                 -- API License Key
  naver_secret_key TEXT,                      -- Secret Key

  -- 네이버 GFA (성과형 디스플레이) 자격증명
  naver_gfa_customer_id VARCHAR(100),
  naver_gfa_api_key VARCHAR(200),
  naver_gfa_secret_key TEXT,

  -- 메타 (Facebook/Instagram) 자격증명
  meta_app_id VARCHAR(100),
  meta_app_secret TEXT,
  meta_access_token TEXT,                     -- Long-lived access token
  meta_token_expires_at TIMESTAMPTZ,
  meta_ad_account_id VARCHAR(100),            -- act_XXXXXXXXX 형식
  meta_business_id VARCHAR(100),

  -- 쿠팡 광고 자격증명 (추후)
  coupang_ads_vendor_id VARCHAR(100),
  coupang_ads_access_key VARCHAR(200),
  coupang_ads_secret_key TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, platform)
);

-- =====================================================
-- 3. 일별 광고비 테이블 (간소화된 이익 계산용)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_spend_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL,              -- 'naver_sa', 'naver_gfa', 'meta', 'coupang_ads'

  -- 광고 성과 지표
  spend DECIMAL(15,2) NOT NULL DEFAULT 0,     -- 총 광고비 (KRW)
  impressions BIGINT DEFAULT 0,               -- 노출수
  clicks INT DEFAULT 0,                       -- 클릭수
  conversions INT DEFAULT 0,                  -- 전환수
  conversion_value DECIMAL(15,2) DEFAULT 0,   -- 전환금액

  -- 계산된 지표
  ctr DECIMAL(8,4) DEFAULT 0,                 -- 클릭률 (%)
  cpc DECIMAL(10,2) DEFAULT 0,                -- 클릭당 비용
  roas DECIMAL(10,2) DEFAULT 0,               -- 광고수익률 (%)

  -- 메타데이터
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, date, platform)
);

-- =====================================================
-- 4. 기존 테이블에 brand_id 추가 (하위호환: NULL 허용)
-- =====================================================

-- api_credentials 테이블에 brand_id 추가
ALTER TABLE api_credentials
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- orders_raw 테이블에 brand_id 추가
ALTER TABLE orders_raw
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- sales_channel_settings 테이블에 brand_id 추가
ALTER TABLE sales_channel_settings
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- ad_performance 테이블에 brand_id, ad_account_id 추가
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS ad_account_id UUID REFERENCES ad_accounts(id);

-- daily_channel_stats 테이블에 brand_id 추가
ALTER TABLE daily_channel_stats
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- daily_ad_stats 테이블에 brand_id 추가
ALTER TABLE daily_ad_stats
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- =====================================================
-- 5. 기존 데이터에 기본 브랜드(howpapa) 할당
-- =====================================================
UPDATE api_credentials
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE orders_raw
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE sales_channel_settings
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE ad_performance
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE daily_channel_stats
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE daily_ad_stats
SET brand_id = (SELECT id FROM brands WHERE code = 'howpapa' LIMIT 1)
WHERE brand_id IS NULL;

-- =====================================================
-- 6. 인덱스 생성
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_brands_code ON brands(code);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_brand ON ad_accounts(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_active ON ad_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_brand ON ad_spend_daily(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_date ON ad_spend_daily(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_brand_date ON ad_spend_daily(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_platform ON ad_spend_daily(platform);

CREATE INDEX IF NOT EXISTS idx_api_credentials_brand ON api_credentials(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_raw_brand ON orders_raw(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_raw_brand_date ON orders_raw(brand_id, order_date);
CREATE INDEX IF NOT EXISTS idx_sales_channel_settings_brand ON sales_channel_settings(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_performance_brand ON ad_performance(brand_id);
CREATE INDEX IF NOT EXISTS idx_daily_channel_stats_brand ON daily_channel_stats(brand_id);
CREATE INDEX IF NOT EXISTS idx_daily_ad_stats_brand ON daily_ad_stats(brand_id);

-- =====================================================
-- 7. 트리거: updated_at 자동 갱신
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brands_updated_at') THEN
    CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ad_accounts_updated_at') THEN
    CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- =====================================================
-- 8. 뷰: 브랜드별 이익 요약 (선택적)
-- =====================================================
CREATE OR REPLACE VIEW brand_profit_summary AS
SELECT
  b.id AS brand_id,
  b.code AS brand_code,
  b.name AS brand_name,
  o.order_date AS date,
  COUNT(DISTINCT o.order_id) AS order_count,
  SUM(o.quantity) AS total_quantity,
  SUM(o.total_price) AS revenue,
  SUM(o.cost_price * o.quantity) AS cost_of_goods,
  SUM(o.channel_fee) AS channel_fees,
  SUM(o.shipping_fee) AS shipping_fees,
  SUM(o.discount_amount) AS discounts,
  SUM(o.profit) AS gross_profit,
  COALESCE(ads.total_spend, 0) AS ad_spend
FROM brands b
LEFT JOIN orders_raw o ON o.brand_id = b.id
LEFT JOIN (
  SELECT brand_id, date, SUM(spend) AS total_spend
  FROM ad_spend_daily
  GROUP BY brand_id, date
) ads ON ads.brand_id = b.id AND ads.date = o.order_date
GROUP BY b.id, b.code, b.name, o.order_date, ads.total_spend;

-- =====================================================
-- 주석: 마이그레이션 완료 후 확인 사항
-- =====================================================
-- 1. brands 테이블에 howpapa, nucio 생성 확인
-- 2. 기존 테이블들에 brand_id 컬럼 추가 확인
-- 3. 기존 데이터가 howpapa 브랜드로 할당 확인
-- 4. 새 브랜드 추가 시: INSERT INTO brands (code, name, ...) VALUES (...)
