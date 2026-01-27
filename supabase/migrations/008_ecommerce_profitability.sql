-- 이커머스 수익성 관리 시스템 DB 스키마
-- 2026-01-27

-- =====================================================
-- 1. SKU 마스터 (제품 원가/판매가 관리)
-- =====================================================
CREATE TABLE IF NOT EXISTS sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nuccio')),
  category VARCHAR(50),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 원가 (VAT 포함)
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 기본 판매가
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- 원가 적용 시작일
  barcode VARCHAR(50),
  supplier VARCHAR(100),  -- 공급업체
  min_stock INT DEFAULT 0,  -- 최소 재고
  current_stock INT DEFAULT 0,  -- 현재 재고
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKU 원가 변경 이력
CREATE TABLE IF NOT EXISTS sku_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES sku_master(id) ON DELETE CASCADE,
  previous_cost DECIMAL(10,2),
  new_cost DECIMAL(10,2) NOT NULL,
  change_reason VARCHAR(200),
  effective_date DATE NOT NULL,
  changed_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채널별 옵션명 → SKU 매핑
CREATE TABLE IF NOT EXISTS channel_option_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES sku_master(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,  -- smartstore, coupang, coupang_rocket, cafe24, qoo10
  option_name VARCHAR(300) NOT NULL,  -- 채널에서 사용하는 옵션명
  channel_product_id VARCHAR(100),  -- 채널 상품 ID
  channel_option_id VARCHAR(100),  -- 채널 옵션 ID
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel, option_name)
);

-- =====================================================
-- 2. 판매 채널 설정
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_channel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL UNIQUE,  -- smartstore, coupang, coupang_rocket, cafe24, qoo10
  channel_name VARCHAR(100) NOT NULL,  -- 표시명
  fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0,  -- 수수료율 (%)
  shipping_fee DECIMAL(10,2) DEFAULT 0,  -- 기본 배송비
  is_active BOOLEAN DEFAULT true,
  api_credentials JSONB,  -- API 자격증명 (암호화 권장)
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'pending',  -- pending, syncing, success, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 채널 설정 삽입
INSERT INTO sales_channel_settings (channel, channel_name, fee_rate, shipping_fee) VALUES
  ('smartstore', '네이버 스마트스토어', 5.5, 0),
  ('coupang', '쿠팡', 12.0, 0),
  ('coupang_rocket', '쿠팡 제트배송', 35.0, 0),
  ('cafe24', 'Cafe24', 3.0, 0),
  ('qoo10', '큐텐 재팬', 10.0, 0)
ON CONFLICT (channel) DO NOTHING;

-- =====================================================
-- 3. 원본 주문 데이터 (채널 API에서 수집)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  order_id VARCHAR(100) NOT NULL,  -- 채널 주문번호
  order_date DATE NOT NULL,
  order_datetime TIMESTAMPTZ,
  product_name VARCHAR(300),
  option_name VARCHAR(300),
  sku_id UUID REFERENCES sku_master(id),  -- 매칭된 SKU
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,  -- 개당 판매가
  total_price DECIMAL(10,2) NOT NULL,  -- 총 결제금액
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  channel_fee DECIMAL(10,2) DEFAULT 0,  -- 채널 수수료
  cost_price DECIMAL(10,2) DEFAULT 0,  -- 원가 (SKU에서 가져옴)
  profit DECIMAL(10,2) DEFAULT 0,  -- 이익
  order_status VARCHAR(50),  -- 주문상태
  buyer_name VARCHAR(100),
  buyer_phone VARCHAR(50),
  shipping_address TEXT,
  currency VARCHAR(10) DEFAULT 'KRW',
  exchange_rate DECIMAL(10,4) DEFAULT 1,  -- 환율 (JPY 등)
  raw_data JSONB,  -- 원본 API 응답
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel, order_id)
);

-- =====================================================
-- 4. 일별 채널 통계 (집계 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_channel_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL,
  brand VARCHAR(20),  -- howpapa, nuccio, null(전체)
  total_orders INT DEFAULT 0,
  total_quantity INT DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,  -- 총 결제금액
  total_cost DECIMAL(15,2) DEFAULT 0,  -- 총 원가
  total_shipping DECIMAL(15,2) DEFAULT 0,  -- 총 배송비
  total_fee DECIMAL(15,2) DEFAULT 0,  -- 총 수수료
  total_discount DECIMAL(15,2) DEFAULT 0,  -- 총 할인
  gross_profit DECIMAL(15,2) DEFAULT 0,  -- 매출총이익
  avg_order_value DECIMAL(10,2) DEFAULT 0,  -- 평균 객단가
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, channel, brand)
);

-- =====================================================
-- 5. 광고 성과 데이터
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL,  -- naver_gfa, naver_sa, meta, coupang_ads
  campaign_id VARCHAR(100),
  campaign_name VARCHAR(200),
  impressions BIGINT DEFAULT 0,  -- 노출수
  clicks INT DEFAULT 0,  -- 클릭수
  cost DECIMAL(15,2) DEFAULT 0,  -- 광고비
  conversions INT DEFAULT 0,  -- 전환수
  conversion_value DECIMAL(15,2) DEFAULT 0,  -- 전환금액
  ctr DECIMAL(8,4) DEFAULT 0,  -- 클릭률 (%)
  cpc DECIMAL(10,2) DEFAULT 0,  -- 클릭당 비용
  roas DECIMAL(10,2) DEFAULT 0,  -- 광고수익률 (%)
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, channel, campaign_id)
);

-- 일별 광고 통계 (집계)
CREATE TABLE IF NOT EXISTS daily_ad_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50),  -- null이면 전체
  total_impressions BIGINT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_conversion_value DECIMAL(15,2) DEFAULT 0,
  avg_ctr DECIMAL(8,4) DEFAULT 0,
  avg_cpc DECIMAL(10,2) DEFAULT 0,
  overall_roas DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, channel)
);

-- =====================================================
-- 6. 공동구매 회차 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS group_purchase_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nuccio')),
  influencer_name VARCHAR(100),
  influencer_handle VARCHAR(100),  -- @xxx
  platform VARCHAR(50),  -- instagram, youtube, blog, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  contribution_profit DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  seeding_project_id UUID,  -- 기존 시딩 프로젝트와 연동
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공동구매 세트 구성
CREATE TABLE IF NOT EXISTS group_purchase_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES group_purchase_rounds(id) ON DELETE CASCADE,
  set_name VARCHAR(100) NOT NULL,  -- A세트, B세트 등
  set_description TEXT,
  regular_price DECIMAL(10,2) NOT NULL,  -- 정가
  sale_price DECIMAL(10,2) NOT NULL,  -- 판매가
  discount_rate DECIMAL(5,2),  -- 할인율 (%)
  total_cost DECIMAL(10,2) DEFAULT 0,  -- 세트 원가 (자동 계산)
  margin_rate DECIMAL(5,2) DEFAULT 0,  -- 마진율 (%)
  stock_quantity INT DEFAULT 0,
  sold_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 세트 구성 상품 (SKU 연동)
CREATE TABLE IF NOT EXISTS group_purchase_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES group_purchase_sets(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES sku_master(id),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공동구매 이벤트/혜택
CREATE TABLE IF NOT EXISTS group_purchase_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES group_purchase_rounds(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,  -- gift, discount, payment_benefit, shipping
  title VARCHAR(200) NOT NULL,
  description TEXT,
  condition_text VARCHAR(200),  -- 조건 (예: 5만원 이상 구매 시)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. 일일 리포트 설정 및 로그
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,  -- kakao_alimtalk, naver_works, email
  is_active BOOLEAN DEFAULT true,
  send_time TIME DEFAULT '09:00:00',
  recipients JSONB,  -- [{name, phone, email}]
  template_id VARCHAR(100),  -- 알림톡 템플릿 ID
  channel_id VARCHAR(100),  -- 네이버웍스 채널 ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,
  report_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,  -- sent, failed, pending
  recipients_count INT DEFAULT 0,
  message_content TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. 환율 설정
-- =====================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency VARCHAR(10) NOT NULL,  -- JPY, USD, etc.
  rate DECIMAL(10,4) NOT NULL,  -- KRW 기준
  effective_date DATE NOT NULL,
  is_auto BOOLEAN DEFAULT false,  -- 자동 업데이트 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(currency, effective_date)
);

-- 기본 환율 삽입
INSERT INTO exchange_rates (currency, rate, effective_date) VALUES
  ('JPY', 9.5, CURRENT_DATE),
  ('USD', 1350, CURRENT_DATE)
ON CONFLICT (currency, effective_date) DO NOTHING;

-- =====================================================
-- 인덱스 생성
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sku_master_brand ON sku_master(brand);
CREATE INDEX IF NOT EXISTS idx_sku_master_sku_code ON sku_master(sku_code);
CREATE INDEX IF NOT EXISTS idx_orders_raw_date ON orders_raw(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_raw_channel ON orders_raw(channel);
CREATE INDEX IF NOT EXISTS idx_orders_raw_sku ON orders_raw(sku_id);
CREATE INDEX IF NOT EXISTS idx_daily_channel_stats_date ON daily_channel_stats(date);
CREATE INDEX IF NOT EXISTS idx_ad_performance_date ON ad_performance(date);
CREATE INDEX IF NOT EXISTS idx_group_purchase_rounds_brand ON group_purchase_rounds(brand);
CREATE INDEX IF NOT EXISTS idx_group_purchase_rounds_status ON group_purchase_rounds(status);

-- =====================================================
-- RLS 정책 (필요시 활성화)
-- =====================================================
-- ALTER TABLE sku_master ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders_raw ENABLE ROW LEVEL SECURITY;
-- ... 등

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sku_master_updated_at') THEN
    CREATE TRIGGER update_sku_master_updated_at BEFORE UPDATE ON sku_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_group_purchase_rounds_updated_at') THEN
    CREATE TRIGGER update_group_purchase_rounds_updated_at BEFORE UPDATE ON group_purchase_rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
