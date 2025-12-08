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
supabase functions deploy api-test
```

### 5. 환경 변수 설정 (선택)
Supabase 대시보드 > Edge Functions > api-test > Settings에서 환경 변수 설정 가능

## 함수 목록

### api-test
API 연결 테스트 함수

**요청:**
```json
{
  "channel": "cafe24" | "naver_smartstore" | "coupang",
  "credentials": {
    "mallId": "...",
    "clientId": "...",
    "clientSecret": "..."
  }
}
```

**응답:**
```json
{
  "success": true,
  "message": "카페24 API 연결 성공!"
}
```

## 주의사항

1. Edge Functions는 Supabase Pro 플랜 이상에서 사용 가능합니다.
2. 프리 티어에서는 월 500,000 호출까지 무료입니다.
3. API 키는 절대 클라이언트에 노출하지 마세요. Edge Function을 통해서만 호출하세요.
