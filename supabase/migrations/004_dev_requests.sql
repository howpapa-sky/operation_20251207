-- 개발 요청서 테이블
CREATE TABLE IF NOT EXISTS dev_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requester VARCHAR(100) NOT NULL,
  brand VARCHAR(20) NOT NULL DEFAULT 'common',
  request_type VARCHAR(20) NOT NULL DEFAULT 'feature',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dev_requests_status ON dev_requests(status);
CREATE INDEX IF NOT EXISTS idx_dev_requests_priority ON dev_requests(priority);
CREATE INDEX IF NOT EXISTS idx_dev_requests_brand ON dev_requests(brand);
CREATE INDEX IF NOT EXISTS idx_dev_requests_request_date ON dev_requests(request_date DESC);

-- RLS 활성화
ALTER TABLE dev_requests ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (모든 사용자 접근 허용)
CREATE POLICY "dev_requests_select" ON dev_requests FOR SELECT USING (true);
CREATE POLICY "dev_requests_insert" ON dev_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_requests_update" ON dev_requests FOR UPDATE USING (true);
CREATE POLICY "dev_requests_delete" ON dev_requests FOR DELETE USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_dev_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dev_requests_updated_at
  BEFORE UPDATE ON dev_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_requests_updated_at();
