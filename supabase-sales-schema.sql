-- ========== 매출 관리 테이블 ==========

-- 제품 테이블 (매입가 포함)
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
  channel TEXT NOT NULL, -- cafe24, naver_smartstore, coupang, other
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON public.sales_records(date);
CREATE INDEX IF NOT EXISTS idx_sales_records_channel ON public.sales_records(channel);
CREATE INDEX IF NOT EXISTS idx_sales_records_user_date ON public.sales_records(user_id, date);

-- RLS 활성화
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- products RLS 정책
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- sales_records RLS 정책
CREATE POLICY "Users can view own sales" ON public.sales_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sales" ON public.sales_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON public.sales_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.sales_records
  FOR DELETE USING (auth.uid() = user_id);

-- 일별 매출 요약 뷰 (선택적)
CREATE OR REPLACE VIEW public.daily_sales_summary AS
SELECT
  user_id,
  date,
  channel,
  SUM(total_revenue) as total_revenue,
  SUM(total_cost) as total_cost,
  SUM(profit) as total_profit,
  COUNT(*) as order_count
FROM public.sales_records
GROUP BY user_id, date, channel;
