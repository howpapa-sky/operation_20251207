-- 브랜드별 API 자격증명 지원을 위한 UNIQUE 제약조건 변경
-- 기존: UNIQUE(user_id, channel) → 변경: UNIQUE(user_id, channel, brand_id)
-- 이를 통해 같은 채널에 대해 브랜드별로 다른 자격증명 등록 가능

-- 1. 기존 unique 제약조건 삭제
ALTER TABLE api_credentials
DROP CONSTRAINT IF EXISTS api_credentials_user_id_channel_key;

-- 2. 새로운 unique 제약조건 추가 (brand_id 포함)
-- brand_id가 NULL인 기존 데이터도 허용 (하위호환)
ALTER TABLE api_credentials
ADD CONSTRAINT api_credentials_user_id_channel_brand_id_key
UNIQUE (user_id, channel, brand_id);

-- 3. 광고 계정 테이블에 RLS 정책 추가 (아직 없는 경우)
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "ad_accounts_select_policy"
ON ad_accounts FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "ad_accounts_insert_policy"
ON ad_accounts FOR INSERT
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "ad_accounts_update_policy"
ON ad_accounts FOR UPDATE
USING (true);

CREATE POLICY IF NOT EXISTS "ad_accounts_delete_policy"
ON ad_accounts FOR DELETE
USING (true);

-- 4. ad_spend_daily 테이블에 RLS 정책 추가
ALTER TABLE ad_spend_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "ad_spend_daily_select_policy"
ON ad_spend_daily FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "ad_spend_daily_insert_policy"
ON ad_spend_daily FOR INSERT
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "ad_spend_daily_update_policy"
ON ad_spend_daily FOR UPDATE
USING (true);
