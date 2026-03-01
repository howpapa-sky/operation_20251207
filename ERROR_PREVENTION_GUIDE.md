# 하우파파 업무관리 시스템 - 오류 방지 가이드

이 문서는 반복되는 오류를 최소화하기 위한 개발 가이드입니다.
모든 개발자(Claude Code, 외부 개발자 포함)는 코드 수정 전 이 문서를 반드시 읽어주세요.

---

## 1. 자주 발생하는 오류 패턴과 해결법

### 1.1 JavaScript Falsy 값 처리 (가장 빈번!)

**문제**: `0`, `""`, `null`, `undefined`가 JavaScript에서 모두 falsy로 처리되어 실제 값인 0이 `-`로 표시됨

```typescript
// ❌ 잘못된 코드 - 0이 falsy라 '-'로 변환됨
const price = data.price || '-';           // 0 → '-'
const count = data.follower_count || '-';  // 0 → '-'

// ✅ 올바른 코드 - nullish coalescing 사용
const price = data.price ?? '-';           // 0 → 0, null → '-'
const count = data.follower_count ?? '-';  // 0 → 0, undefined → '-'

// ✅ 더 안전한 방법 - 명시적 null/undefined 체크
const price = data.price !== null && data.price !== undefined ? data.price : '-';
```

**⚠️ 중요 예외**: `parseFloat()`, `Number()`, `parseInt()` 결과에는 반드시 `||` 사용!

```typescript
// ❌ 잘못된 코드 - NaN은 nullish가 아니므로 ?? 통과
const parsed = parseFloat("invalid") ?? 0;  // NaN (버그!)

// ✅ 올바른 코드 - ||는 NaN도 falsy로 처리
const parsed = parseFloat(input) || 0;      // NaN → 0
const num = Number(value) || 0;             // NaN → 0
const int = parseInt(str) || 0;             // NaN → 0
```

**적용 위치**: 모든 데이터 표시 컴포넌트, 특히 금액/수량/통계 관련

### 1.2 한국어 날짜 파싱

**문제**: Google Sheets나 외부 데이터에서 `"12월4일"`, `"1월15일"` 같은 한국어 날짜가 들어옴

**이미 구현됨**: `netlify/functions/google-sheets-sync.ts`의 `parseDate()` 함수가 아래 8가지 형식을 지원합니다:

| 형식 | 예시 |
|------|------|
| ISO | `2026-01-15` |
| YYYY.MM.DD / YYYY/MM/DD | `2026.01.15` |
| YY-MM-DD | `26-01-15` |
| MM/DD/YYYY | `01/15/2026` |
| MM/DD | `01/15` (올해 기준) |
| 한국어 | `1월15일`, `1월 15일` |
| 한국어 (연도 포함) | `2026년1월15일` |
| Google Sheets 시리얼 | `45307` |

**적용 위치**: `netlify/functions/google-sheets-sync.ts` (`parseDate` 함수)

### 1.3 API 토큰 만료 처리

**문제**: Meta, Cafe24, Naver 토큰이 만료되면 사이트 전체에서 해당 채널 데이터가 안 보임

```typescript
// ❌ 토큰 만료 시 아무 표시 없이 실패
const data = await fetchMetaAds(token);

// ✅ handleApiError 유틸리티 사용 (src/lib/apiErrorHandler.ts)
import { handleApiError } from '@/lib/apiErrorHandler';

try {
  const data = await fetchMetaAds(token);
  if (!data) throw new Error('Empty response');
  return data;
} catch (error) {
  handleApiError(error, 'Meta 광고 조회');
  // handleApiError가 자동으로:
  // - 인증 오류 시 "로그인이 만료되었습니다" toast 표시
  // - 네트워크 오류 시 "서버에 연결할 수 없습니다" toast 표시
  // - 기타 오류 시 에러 메시지 toast 표시
}
```

**토큰 만료 일정 관리**:

| 플랫폼 | 토큰 유효기간 | 갱신 방법 |
|--------|-------------|----------|
| Meta Ads | ~60일 | 수동 재발급 또는 long-lived 토큰 변환 |
| Cafe24 | access_token 2시간, refresh_token 14일 | 자동 갱신 구현 필요 |
| Naver Commerce | 발급 후 일정시간 | NCP 프록시에서 자동 갱신 |
| Naver Search Ads | API Key 기반 | 만료 없음 (키 관리 필요) |

### 1.4 NCP 프록시 서버 관련

**문제**: Netlify Function → NCP 프록시 → 외부 API 구조에서 중간 단계 오류

```
[일반적인 오류 시나리오]

1. NCP 서버 다운 → Netlify Function에서 timeout
2. ACG 방화벽 규칙 변경 → 연결 거부
3. server.js 수정 후 재시작 안 함 → 이전 코드 실행
4. 환경변수 누락 → API key 인증 실패
```

**체크리스트 (API 연동 오류 시)**:
1. NCP 서버 상태 확인: `systemctl status naver-proxy`
2. 서버 로그 확인: `journalctl -u naver-proxy --no-pager -n 50`
3. 헬스체크: `curl http://49.50.131.90:3100/health`
4. 환경변수 확인: `/opt/naver-proxy/.env`
5. 재시작: `systemctl restart naver-proxy`

### 1.5 Supabase RLS 정책 누락

**문제**: 새 테이블 추가 후 RLS 정책을 안 넣으면 프론트엔드에서 데이터 조회/입력 불가

```sql
-- ✅ 새 테이블 생성 시 반드시 함께 실행
ALTER TABLE public.새테이블명 ENABLE ROW LEVEL SECURITY;

-- 읽기 정책
CREATE POLICY "Users can read own data" ON public.새테이블명
  FOR SELECT USING (auth.uid() = user_id);

-- 쓰기 정책
CREATE POLICY "Users can insert own data" ON public.새테이블명
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 수정 정책
CREATE POLICY "Users can update own data" ON public.새테이블명
  FOR UPDATE USING (auth.uid() = user_id);

-- 삭제 정책
CREATE POLICY "Users can delete own data" ON public.새테이블명
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 2. 코드 수정 시 필수 체크리스트

### 2.1 수정 전 확인
- [ ] 수정할 파일의 import/export 의존성 파악 (어떤 파일이 이 파일을 참조하는지)
- [ ] 관련 타입 정의 확인 (`src/types/index.ts`)
- [ ] 관련 Zustand 스토어 확인 (`src/store/`)
- [ ] shadcn/ui 컴포넌트 사용 가능 여부 확인
- [ ] `ERROR_PREVENTION_GUIDE.md` 읽었는지 확인

### 2.2 수정 후 확인
- [ ] `npm run build` 실행 → 빌드 에러 없는지 확인
- [ ] `npm run lint` 실행 → 타입 에러 없는지 확인
- [ ] 브라우저 콘솔에 에러 없는지 확인
- [ ] 수정한 기능 외에 관련 기능이 깨지지 않았는지 확인
- [ ] 0, null, undefined 값이 올바르게 표시되는지 확인
- [ ] API 에러 발생 시 `handleApiError()` 호출하여 toast 알림 표시되는지 확인

### 2.3 DB 변경 시 추가 확인
- [ ] SQL 파일로 별도 저장 (Supabase SQL Editor에서 실행)
- [ ] RLS 정책 포함 여부 확인
- [ ] `src/types/index.ts` 타입 업데이트
- [ ] 관련 스토어 함수 업데이트 (`dbToInfluencer`, `addInfluencer` 등)

---

## 3. 파일 의존성 맵 (수정 시 영향 범위)

### 3.1 시딩 기능

```
src/types/index.ts (타입 정의)
    ↓ 참조됨
src/store/seedingStore.ts (데이터 CRUD)
    ↓ 참조됨
src/components/seeding/*.tsx (UI 컴포넌트)
    ↓ 참조됨
src/pages/seeding/*.tsx (페이지)

netlify/functions/google-sheets-sync.ts (시트 동기화)
    ↓ 호출됨
src/services/googleSheetsService.ts (프론트 서비스)
```

시딩 관련 수정 시: **타입 → 스토어 → 컴포넌트** 순서로 확인

### 3.2 매출/광고 기능

```
src/types/index.ts + src/types/ecommerce.ts
    ↓
src/store/useSalesStore.ts (매출 운영, 494줄)
src/store/salesDashboardStore.ts (매출 분석, 609줄)
src/store/useAdAccountStore.ts (광고 계정, 290줄)
    ↓
netlify/functions/commerce-proxy.ts (Netlify Function)
    ↓
naver-proxy/server.js (NCP 프록시)
    ↓
외부 API (Cafe24, Naver, Coupang, Meta, etc.)
```

매출/광고 관련 수정 시: **프론트 + Netlify Function + NCP 서버** 3곳 모두 확인

### 3.3 인증/사용자

```
src/store/useStore.ts (인증: login, register, logout, checkAuth 포함)
    ↓
src/components/layout/Sidebar.tsx, Header.tsx
    ↓
모든 페이지 (user_id 기반 RLS)
```

---

## 4. 환경별 배포 체크리스트

### 4.1 프론트엔드 (Netlify)

```bash
# 배포 전
npm run build          # 빌드 성공 확인
npm run lint           # 린트 통과 확인

# 배포
git add -A
git commit -m "fix: 수정 내용"
git push origin main   # Netlify 자동 배포
```

### 4.2 NCP 프록시 서버

```bash
# SSH 접속 후
cd /opt/naver-proxy

# server.js 업데이트
curl -o server.js "https://raw.githubusercontent.com/howpapa-sky/operation_20251207/main/naver-proxy/server.js"

# 재시작
systemctl restart naver-proxy

# 확인
systemctl status naver-proxy
curl http://localhost:3100/health
```

### 4.3 Supabase DB
1. SQL 쿼리를 `.sql` 파일로 저장
2. Supabase Dashboard → SQL Editor에서 실행
3. 프론트엔드에서 데이터 확인

---

## 5. API 연동 디버깅 순서

오류 발생 시 아래 순서로 확인:

```
Step 1: 브라우저 개발자도구 → Network 탭
        → API 요청 URL, 상태코드, 응답 내용 확인

Step 2: 브라우저 Console 탭
        → JavaScript 에러 메시지 확인

Step 3: Netlify Functions 로그
        → Netlify 대시보드 → Functions → 해당 함수 로그

Step 4: NCP 서버 로그
        → SSH 접속 → journalctl -u naver-proxy -f

Step 5: 외부 API 직접 테스트
        → Postman이나 curl로 API 직접 호출
```

---

## 6. 금지사항 (절대 하면 안 되는 것)

1. **`any` 타입 사용 금지** - 명시적 타입 정의 필수
2. **`||` 연산자로 숫자 기본값 설정 금지** - `??` (nullish coalescing) 사용
   - **단, `parseFloat()`, `Number()`, `parseInt()` 결과에는 `||` 사용** (NaN 처리)
3. **shadcn/ui 없이 직접 HTML 태그 사용 금지** - Button, Input 등 반드시 shadcn 사용
4. **RLS 정책 없이 테이블 생성 금지**
5. **빌드 확인 없이 배포 금지** - `npm run build` 필수
6. **server.js 수정 후 재시작 누락 금지** - `systemctl restart naver-proxy`
7. **타입 정의 업데이트 없이 DB 스키마 변경 금지**
8. **환경변수를 코드에 하드코딩 금지** - `.env` 또는 Netlify 환경변수 사용

---

## 7. 이미 구현된 보호 장치

아래 파일들은 이미 구현되어 운영 중입니다. 삭제하지 마세요.

| 파일 | 역할 | 사용 위치 |
|------|------|----------|
| `src/components/common/ErrorBoundary.tsx` | React Error Boundary (에러 시 새로고침 버튼 표시) | `App.tsx` 최상위, `Layout.tsx` Outlet 감싸기 |
| `src/lib/apiErrorHandler.ts` | API 에러 핸들러 (인증/네트워크/일반 에러 분류 + toast 알림) | 6개 스토어에서 `handleApiError()` 호출 |
| `src/lib/envCheck.ts` | 앱 시작 시 필수 환경변수 체크 | `main.tsx`에서 호출 |
| `src/components/common/ApiStatusMonitor.tsx` | 설정 페이지에서 채널별 API 연결 상태 표시 | `SettingsPage.tsx` API 탭 |
| `src/components/ui/toaster.tsx` | Toast 알림 렌더링 | `App.tsx`, `Layout.tsx` |

---

## 8. 현재 알려진 이슈 (Known Issues)

| 이슈 | 상태 | 원인 | 해결 방법 |
|------|------|------|----------|
| Meta 토큰 만료 | 주기적 발생 | 60일 유효기간 | 수동 재발급 (자동 갱신 구현 예정) |
| Cafe24 주문 조회 6개월 제한 | 플랫폼 제한 | API 스펙 | 30일 단위 분할 조회로 대응 중 |
| Naver API IP 제한 | 구조적 | 고정IP 필요 | NCP 프록시 경유 |
| Google Sheets 동기화 시 기존 데이터 삭제 | 의도된 동작 | 전체 교체 방식 | 향후 증분 동기화로 개선 예정 |

---

## 9. 환경변수

### 프론트엔드 (필수)

| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 익명 키 |

### Netlify Functions (서버사이드)

| 변수 | 설명 | 사용 함수 |
|------|------|----------|
| `SUPABASE_URL` | Supabase URL (서버사이드) | commerce-proxy, daily-seeding-report 등 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 | commerce-proxy, google-sheets-sync 등 10개+ |
| `NAVER_PROXY_URL` | NCP 프록시 URL (기본: http://49.50.131.90:3100) | commerce-proxy, naver-api-test |
| `NAVER_PROXY_API_KEY` | NCP 프록시 인증 키 | commerce-proxy, naver-smartstore-sync |
| `NAVER_WORKS_CLIENT_ID` | 네이버웍스 알림용 | daily-seeding-report, seeding-kpi-alert, weekly-report |
| `NAVER_WORKS_CLIENT_SECRET` | 네이버웍스 알림용 | 위와 동일 |
| `NAVER_WORKS_SERVICE_ACCOUNT` | 네이버웍스 알림용 | 위와 동일 |
| `NAVER_WORKS_BOT_ID` | 네이버웍스 알림용 | 위와 동일 |
| `NAVER_WORKS_CHANNEL_ID` | 네이버웍스 알림용 | 위와 동일 |
| `NAVER_WORKS_PRIVATE_KEY` | 네이버웍스 알림용 | 위와 동일 |
| `SMTP_USER` | 이메일 발송 계정 | send-email, daily-reminder, test-report |
| `SMTP_PASS` | 이메일 발송 비밀번호 | 위와 동일 |

### NCP 프록시 서버 (.env)

| 변수 | 설명 |
|------|------|
| `PROXY_API_KEY` | 프록시 서버 인증 키 (클라이언트가 x-api-key로 전송) |
| `PORT` | 서버 포트 (기본: 3100) |

---

## 10. 과거 오류 이력 (동일 실수 방지)

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
| 9 | 0원/0명 표시 안됨 | `\|\|` 연산자가 0을 falsy로 처리 | 숫자 필드에 `??` 사용 |

---

## 11. 연락처 및 참고 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| CLAUDE.md | 프로젝트 루트 | 기술 스택, 코딩 컨벤션, 기능별 상세 |
| SITE_STRUCTURE.md | 프로젝트 루트 | 전체 사이트 구조, 페이지/컴포넌트 목록 |
| CHANGELOG.md | 프로젝트 루트 | 변경 이력 관리 |
| supabase-all-schema.sql | 프로젝트 루트 | DB 전체 스키마 |
| src/lib/apiErrorHandler.ts | src/lib/ | API 에러 핸들러 유틸리티 |
| src/lib/envCheck.ts | src/lib/ | 환경변수 검증 함수 |
| src/components/common/ErrorBoundary.tsx | src/components/common/ | React Error Boundary |
| src/components/common/ApiStatusMonitor.tsx | src/components/common/ | API 연결 상태 모니터 |
| Netlify Dashboard | app.netlify.com | 배포 상태, Functions 로그 |
| Supabase Dashboard | supabase.com | DB 관리, SQL Editor |
| NCP Console | console.ncloud.com | 서버 관리 |

---

**이 가이드를 무시하고 발생한 오류는 개발자 책임입니다.
수정 요청 시 이 가이드의 체크리스트를 반드시 따라주세요.**
