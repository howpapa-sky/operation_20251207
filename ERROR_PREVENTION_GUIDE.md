# 오류 방지 가이드 (Error Prevention Guide)

> 하우파파/누씨오 운영 관리 시스템의 코드 변경 시 반드시 확인해야 할 체크리스트입니다.

---

## 1. 코드 변경 전 체크리스트

### 1.1 Falsy 값 처리
- [ ] 숫자 필드(금액, 수량, 팔로워 수 등)의 기본값 설정 시 `??` 사용
- [ ] `||`는 빈 문자열/NaN 처리가 필요한 경우에만 사용
- [ ] `parseFloat()`, `Number()`, `parseInt()` 결과에는 `||` 사용 (NaN 처리)

```typescript
// 올바른 사용
const price = product.price ?? 0;           // 숫자 필드 - ?? 사용
const name = product.name || '미정';         // 문자열 필드 - || 사용
const parsed = parseFloat(input) || 0;       // 파싱 결과 - || 사용 (NaN 처리)
```

### 1.2 API 호출
- [ ] 모든 API 호출에 try-catch 적용
- [ ] 에러 발생 시 toast 알림으로 사용자에게 표시
- [ ] 네트워크 오류 시 명확한 한국어 메시지 표시
- [ ] 토큰 만료 시 재로그인 안내

```typescript
import { handleApiError } from '@/lib/apiErrorHandler';

try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
} catch (error) {
  handleApiError(error, '데이터 조회');
}
```

### 1.3 컴포넌트 안전성
- [ ] 주요 페이지에 ErrorBoundary 적용 확인
- [ ] 옵셔널 체이닝(`?.`) 사용으로 null 참조 방지
- [ ] 배열 렌더링 시 빈 배열 기본값 제공 (`data ?? []`)

---

## 2. 절대 변경 금지 코드

### 2.1 네이버 커머스 API URL
```
토큰: https://api.commerce.naver.com/external/v1/oauth2/token
주문상태: https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses
주문상세: https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query
```
> `product-orders`를 `orders`로 바꾸면 404 발생!

### 2.2 네이버 토큰 생성 공식
```javascript
hashedSign = bcrypt.hashSync(clientId + '_' + timestamp, clientSecret);
base64Sign = Buffer.from(hashedSign).toString('base64');
```
> Base64 인코딩을 빼면 인증 오류 발생!

### 2.3 NCP 프록시 인증 헤더
```javascript
const apiKey = req.headers['x-api-key'] || req.headers['x-proxy-api-key'];
```
> 두 헤더 모두 허용해야 합니다.

---

## 3. 커밋/PR 전 체크리스트

### 빌드 & 린트
- [ ] `npm run lint` 에러 0개
- [ ] `npm run build` 성공
- [ ] 콘솔에 새로운 에러/경고 없음

### 기능 확인
- [ ] 0값이 정상 표시되는지 확인 (금액, 수량 등)
- [ ] 에러 발생 시 toast 알림이 표시되는지 확인
- [ ] 각 페이지에서 ErrorBoundary가 정상 작동하는지 확인

### 코드 품질
- [ ] `any` 타입 사용하지 않았는지 확인
- [ ] 수정 대상이 아닌 코드가 변경되지 않았는지 diff 확인
- [ ] 기존 함수 시그니처가 변경되지 않았는지 확인
- [ ] 브랜드명은 'howpapa' 또는 'nucio'만 사용

---

## 4. 브랜드 관련 규칙

| 규칙 | 설명 |
|------|------|
| 브랜드명 | 'howpapa' 또는 'nucio'만 사용 (nuccio X) |
| 브랜드 필터 | 모든 데이터 조회 시 brand 필터 적용 |
| 브랜드 색상 | howpapa: orange-500, nucio: green-500 |

---

## 5. 환경변수

### 필수 환경변수
| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 익명 키 |

### Netlify 환경변수
| 변수 | 설명 |
|------|------|
| `NAVER_PROXY_URL` | NCP 프록시 서버 URL |
| `NAVER_PROXY_API_KEY` | NCP 프록시 API 키 |

---

## 6. 과거 오류 이력 (동일 실수 방지)

| # | 오류 | 원인 | 교훈 |
|---|------|------|------|
| 1 | 네이버 인증 실패 | Base64 인코딩 누락 | 토큰 공식 변경 금지 |
| 2 | 주문 동기화 404 | URL `product-orders` → `orders` 변경 | 수정 대상 외 코드 변경 금지 |
| 3 | EADDRINUSE | 이전 프로세스 포트 점유 | 배포 시 `fuser -k` 먼저 실행 |
| 4 | 401 Unauthorized | 인증 헤더 불일치 | 양쪽 헤더 모두 허용 |
| 5 | 504 Timeout | 엔드포인트 미존재 | 전체 경로 확인 필수 |
| 6 | 브랜드 불일치 | 'nuccio' vs 'nucio' | 브랜드명 통일 |
| 7 | 광고비 미표시 | NCP 프록시 경유 실패 | 광고 API는 직접 호출 |
| 8 | 데이터 누락 | Supabase 1000건 limit | cursor-based pagination |

---

## 7. 배포 프로세스

```bash
# 1. 린트 & 빌드 검증
npm run pre-deploy

# 2. 커밋 & 푸시
git add .
git commit -m "설명"
git push origin main

# 3. NCP 서버 배포 (server.js 변경 시)
ssh root@49.50.131.90
cd /opt/naver-proxy
curl -o server.js "https://raw.githubusercontent.com/.../server.js"
systemctl restart naver-proxy
systemctl status naver-proxy
```

---

## 8. 테스트 체크리스트

### 매출 관련
- [ ] 매출 대시보드에서 0원 매출이 정상 표시
- [ ] 채널별 이익 계산이 정확
- [ ] 주문 동기화 후 데이터 정합성 확인

### 시딩 관련
- [ ] 인플루언서 팔로워 0명이 정상 표시
- [ ] 제품 가격 0원이 정상 표시
- [ ] Google Sheets 동기화 정상 작동

### API 연동
- [ ] 각 채널 연결 테스트 통과
- [ ] 토큰 만료 시 명확한 안내
- [ ] 프록시 서버 health check 정상
