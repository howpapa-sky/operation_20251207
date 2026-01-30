# Supabase Edge Functions

## 배포 방법

### 1. Supabase CLI 설치
```bash
npm install -g supabase
```

### 2. 로그인
```bash
supabase login
```

### 3. 프로젝트 연결
```bash
supabase link --project-ref <your-project-ref>
```

프로젝트 ref는 Supabase 대시보드 URL에서 확인:
`https://supabase.com/dashboard/project/<project-ref>`

### 4. Edge Function 배포
```bash
# API 연결 테스트 함수
supabase functions deploy api-test

# 네이버 스마트스토어 주문 동기화 함수
supabase functions deploy naver-smartstore-sync
```

### 5. 환경 변수 설정
Supabase 대시보드 > Edge Functions > Settings에서 환경 변수 설정:

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | 자동 설정 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 역할 키 | 자동 설정 |

## 함수 목록

### api-test
API 연결 테스트 함수. 각 판매 채널의 자격증명으로 실제 API 연결을 테스트합니다.

**요청:**
```json
{
  "channel": "cafe24" | "naver_smartstore" | "coupang",
  "credentials": {
    "naverClientId": "...",
    "naverClientSecret": "..."
  }
}
```

**응답:**
```json
{
  "success": true,
  "message": "네이버 스마트스토어 API 연결 성공!"
}
```

### naver-smartstore-sync
네이버 스마트스토어 주문 데이터 동기화 함수.
지정된 기간의 주문 데이터를 네이버 커머스 API에서 가져와 DB에 저장합니다.

**인증 방식:** HMAC-SHA256 (client_secret_sign = Base64(HMAC-SHA256(clientSecret, clientId + "_" + timestamp)))

**요청:**
```json
{
  "userId": "user-uuid",
  "clientId": "네이버 커머스 API Client ID",
  "clientSecret": "네이버 커머스 API Client Secret",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**응답:**
```json
{
  "success": true,
  "message": "네이버 스마트스토어 동기화 완료: 150건 조회 (신규 120건, 업데이트 30건)",
  "data": {
    "totalOrders": 150,
    "created": 120,
    "updated": 30
  }
}
```

**동기화 흐름:**
1. HMAC-SHA256 서명으로 액세스 토큰 발급
2. 변경된 주문 목록 조회 (last-changed-statuses API)
3. 상품주문 상세 조회 (product-orders/query API)
4. DB에 upsert (product_order_id 기준)
5. 동기화 로그 저장

## Netlify 함수 대안

Edge Function 배포가 어려운 경우 Netlify Functions를 사용할 수 있습니다:

| Edge Function | Netlify Function |
|---------------|------------------|
| `api-test` | `naver-api-test` |
| `naver-smartstore-sync` | `naver-smartstore-sync` |

Netlify Functions는 `netlify/functions/` 디렉토리에 있으며, Netlify 배포 시 자동으로 사용 가능합니다.

Netlify Functions 환경 변수 (Netlify Dashboard > Environment Variables):
- `SUPABASE_URL` 또는 `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 주의사항

1. Edge Functions는 Supabase Pro 플랜 이상에서 사용 가능합니다.
2. 프리 티어에서는 월 500,000 호출까지 무료입니다.
3. API 키는 절대 클라이언트에 노출하지 마세요. Edge Function 또는 Netlify Function을 통해서만 호출하세요.
4. 네이버 커머스 API 토큰은 발급 후 일정 시간 유효합니다 (보통 1시간).
