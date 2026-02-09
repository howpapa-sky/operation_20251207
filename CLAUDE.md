# Howpapa & Nucio Operation System

## 프로젝트 개요
하우파파(howpapa)와 누치오(nucio) 브랜드의 운영 관리 시스템.
인플루언서 시딩, 프로젝트 관리, 매출 분석, 주문 동기화, 광고비 관리를 통합 제공.

## 기술 스택
| 영역 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | React + TypeScript + Vite | 19.2 / 5.9 / 7.2 |
| 스타일링 | Tailwind CSS + shadcn/ui (New York style) | 3.4 |
| 상태관리 | Zustand (persist middleware) | 5.0 |
| 백엔드 | Supabase (PostgreSQL + Auth + RLS) | 2.86 |
| 서버리스 | Netlify Functions (18개) | Node 20 |
| API 프록시 | NCP Express 서버 (고정 IP) | — |
| 차트 | Recharts | 3.5 |
| 캘린더 | FullCalendar | 6.1 |
| 아이콘 | Lucide React | 0.556 |
| 날짜 | date-fns | 4.1 |

## 브랜드 테마
| 브랜드 | Primary Color | 사용처 |
|--------|---------------|--------|
| howpapa | `orange-500` / `#f97316` | 메인 브랜드 |
| nucio | `green-500` / `#22c55e` | 서브 브랜드 |

- 모든 DB 테이블에 `brand` 컬럼 존재 ('howpapa' | 'nucio')
- `brandStore.ts`에서 현재 선택된 브랜드 관리
- 각 스토어에서 브랜드별 데이터 필터링

---

## 디렉토리 구조
```
src/
├── components/
│   ├── ui/              # shadcn/ui 컴포넌트 (14개: button, card, input, dialog, dropdown-menu, label, select, sheet, table, tabs, textarea, badge, toast, toaster)
│   ├── common/          # 커스텀 공통 컴포넌트 (16개)
│   ├── layout/          # Layout, Header, Sidebar
│   ├── seeding/         # 시딩 관련 (27개, report/ 하위 포함)
│   ├── dashboard/       # SeedingKPICard, MultiBrandDashboard
│   ├── sales/           # OrderSyncPanel, ProfitBreakdownCard, ChannelSummaryCard
│   ├── projects/        # 프로젝트 관리 + views/ (Dashboard, Calendar, Workflow, Gantt, Timeline, Board, Workload)
│   └── products/        # ProductMasterDetail, ProductMasterForm
├── pages/               # 페이지 컴포넌트 (26개 + seeding/ 8개)
│   └── seeding/         # 시딩 관련 페이지
├── store/               # Zustand 스토어 (18개, ~7,088 lines)
├── services/            # API/비즈니스 서비스 (4개)
├── lib/                 # supabase.ts, utils.ts(cn), sendEmail.ts, sendNaverWorks.ts
├── utils/               # helpers.ts (포맷팅, 상태 레이블, 변환)
├── types/               # 타입 정의 (3개, ~2,596 lines)
└── hooks/               # use-toast.ts, useAutoSync.ts

netlify/functions/       # Netlify 서버리스 함수 (18개)
naver-proxy/             # NCP Express 프록시 서버
supabase/
├── migrations/          # DB 마이그레이션 (12개)
└── functions/           # Supabase Edge Functions (3개)
```

## Import Alias
`@/` = `src/` (예: `import { Button } from "@/components/ui/button"`)

---

## 라우트 구조

### 인증 불필요 (Public)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/login` | LoginPage | 로그인 |
| `/register` | RegisterPage | 회원가입 |
| `/g/:slug` | ProductGuidePublicPage | 공개 제품 가이드 링크 |
| `/auth/cafe24` | Cafe24CallbackPage | Cafe24 OAuth 콜백 |

### 인증 필요 (Protected, Layout 내부)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | DashboardPage | 메인 대시보드 (KPI, 최근 활동) |
| `/sampling` | SamplingPage | 샘플링 프로젝트 관리 |
| `/detail-page` | DetailPagePage | 상세 페이지 프로젝트 |
| `/influencer` | InfluencerPage | 인플루언서 프로젝트 |
| `/product-order` | ProductOrderPage | 제품 주문 프로젝트 |
| `/group-purchase` | GroupPurchasePage | 공동구매 프로젝트 |
| `/other` | OtherPage | 기타 프로젝트 |
| `/dev-requests` | DevRequestPage | 개발 요청서 |
| `/sales-dashboard` | SalesDashboardPage | 매출 분석 대시보드 |
| `/sales/costs` | SalesCostInputPage | 원가 입력 |
| `/sales/channels` | SalesChannelSettingsPage | 채널 설정 |
| `/sales/profit-settings` | SalesProfitSettingsPage | 이익 계산 설정 |
| `/sales/orders` | OrdersListPage | 주문서 전체목록 |
| `/products` | SKUMasterPage | SKU/제품 관리 |
| `/promotion` | PromotionPage | 프로모션 관리 |
| `/statistics` | StatisticsPage | 통계/분석 |
| `/settings` | SettingsPage | 시스템 설정 |
| `/daily-reports` | DailyReportSettingsPage | 일일 리포트 설정 |
| `/personal/notes` | PersonalNotesPage | 개인 메모 |
| `/personal/my-tasks` | MyTasksPage | 내 업무 |
| `/personal/status-updates` | StatusUpdatesPage | 상태 업데이트 |

### 시딩 (Seeding)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/seeding` | SeedingProjectsPage | 프로젝트 목록 |
| `/seeding/list` | SeedingListPage | 인플루언서 리스트 |
| `/seeding/list/:projectId` | SeedingListPage | 프로젝트별 리스트 |
| `/seeding/outreach` | OutreachPage | 아웃리치 메시지 |
| `/seeding/shipping` | ShippingPage | 배송 추적 |
| `/seeding/guides` | ProductGuidesPage | 제품 가이드 목록 |
| `/seeding/guides/new` | ProductGuideEditPage | 가이드 생성 |
| `/seeding/guides/:id/edit` | ProductGuideEditPage | 가이드 편집 |
| `/seeding/reports` | SeedingReportsPage | 성과 리포트 |

---

## Zustand 스토어 (18개)

| 스토어 파일 | Lines | 설명 |
|------------|-------|------|
| `useStore.ts` | 1,003 | 메인 앱 상태 (인증, 프로젝트, 평가, 알림, 필터, UI) |
| `seedingStore.ts` | 1,412 | 시딩 전체 (프로젝트, 인플루언서, 템플릿, 가이드, 성과, 벌크) |
| `salesDashboardStore.ts` | 607 | 매출 분석 (채널, 주문, 이익, 트렌드, KPI) |
| `useSalesStore.ts` | 494 | 매출 운영 (주문 관리, 채널 설정, 동기화 상태) |
| `useProductMasterStore.ts` | 543 | 제품 마스터 (CRUD, 검색, 필터, 카테고리) |
| `useProjectFieldsStore.ts` | 414 | 프로젝트 커스텀 필드 정의 |
| `useProjectSettingsStore.ts` | 312 | 프로젝트 워크플로우 설정 |
| `usePersonalTaskStore.ts` | 344 | 개인 업무 (CRUD, 필터, 할당, 리마인더) |
| `useApiCredentialsStore.ts` | 243 | API 자격증명 (채널별 API 키, OAuth 토큰) |
| `devRequestStore.ts` | 235 | 개발 요청서 (CRUD, 상태 관리, 할당) |
| `useAdAccountStore.ts` | 284 | 광고 계정 관리 (Naver SA/GFA, Meta, Coupang) |
| `skuMasterStore.ts` | 419 | SKU 마스터 (원가, 판매가, 유효일자, 이력) |
| `usePromotionStore.ts` | 167 | 프로모션 (CRUD, 스케줄링, 성과) |
| `brandStore.ts` | 128 | 멀티 브랜드 (현재 브랜드 선택, 브랜드별 설정) |
| `channelSettingsStore.ts` | 91 | 판매 채널 설정 (수수료율, 배송 설정) |
| `profitSettingsStore.ts` | 124 | 이익 계산 (고정비, 변동비, 마진) |
| `useAlertSettingsStore.ts` | 129 | 알림 설정 (규칙, 임계값, 수신자) |
| `useUserManagementStore.ts` | 139 | 사용자 관리 (CRUD, 역할, 권한) |

---

## 서비스 (4개)

| 서비스 | Lines | 설명 |
|--------|-------|------|
| `orderSyncService.ts` | 249 | 전 채널 주문 동기화 (청크 분할, 진행률 콜백) |
| `salesApiService.ts` | 253 | 매출 API (주문 조회, 이익 계산, 내보내기) |
| `googleSheetsService.ts` | 219 | Google Sheets 연동 (읽기/쓰기, 시딩 동기화) |
| `adSyncService.ts` | 172 | 광고 플랫폼 동기화 (Naver SA/GFA, Meta, Coupang Ads) |

---

## 타입 정의 (3개)

| 파일 | Lines | 핵심 타입 |
|------|-------|-----------|
| `types/index.ts` | 1,220 | User, Brand, Project, SeedingProject, SeedingInfluencer, SeedingStatus, OutreachTemplate, ProductGuide, Notification |
| `types/database.ts` | 767 | Supabase Row/Insert/Update 타입 (모든 테이블) |
| `types/ecommerce.ts` | 609 | BrandCode, AdPlatform, AdAccount, AdSpendDaily, SKUMaster, OrderRaw, SalesChannel, ProfitSettings |

---

## UI 컴포넌트 사용 규칙 (중요!)

### 1. shadcn/ui 컴포넌트 우선 사용 (`src/components/ui/`)
새 UI를 만들기 전에 항상 shadcn/ui 컴포넌트를 먼저 확인:

```tsx
// 좋은 예 - shadcn/ui 컴포넌트 사용
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// 나쁜 예 - 직접 HTML 태그 사용
<button className="...">버튼</button>  // X
<input className="..." />              // X
```

### 2. 새 shadcn 컴포넌트 추가
```bash
npx shadcn@latest add [component-name]
```

### 3. 커스텀 공통 컴포넌트 (`src/components/common/`)
shadcn/ui에 없는 비즈니스 로직 컴포넌트:
- `SlidePanel` - 사이드 패널
- `StatusTabs` - 상태별 탭
- `StatsCard` - 통계 카드
- `EmptyState` - 빈 상태 표시
- `FilterBar` - 필터 바
- `ImageUploader` - 이미지 업로더
- `BrandSelector` - 브랜드 선택기
- `CopyButton` - 복사 버튼
- `ConfirmModal` - 확인 모달
- `TagInput` - 태그 입력
- `UserSelect` - 사용자 선택 드롭다운
- `UpcomingSchedules` - 일정 표시
- `Modal` - 기본 모달

### 4. cn() 유틸리티로 클래스 병합
```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)}>
```

---

## 코딩 컨벤션

### 네이밍
- **컴포넌트**: PascalCase (`ProjectCard.tsx`)
- **함수/변수**: camelCase (`fetchProjects`, `isLoading`)
- **상수**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **타입/인터페이스**: PascalCase (`interface Project`)

### 파일 구조
- 페이지별 컴포넌트는 `pages/[feature]/` 하위에
- UI 컴포넌트는 `components/ui/` (shadcn)
- 비즈니스 컴포넌트는 `components/common/`
- 도메인별 컴포넌트는 `components/[domain]/` (seeding, sales, dashboard, projects, products)

---

## Supabase 규칙
- 테이블명: snake_case (`seeding_projects`)
- 컬럼명: snake_case (`created_at`, `user_id`)
- RLS 정책 필수 적용
- 타입은 `src/types/database.ts`에 정의

### 주요 테이블
**시딩**: `seeding_projects`, `seeding_influencers`, `outreach_templates`, `product_guides`
**프로젝트**: `projects`, `evaluation_criteria`, `project_type_settings`, `project_field_settings`
**이커머스**: `sku_master`, `sku_cost_history`, `channel_option_mapping`, `sales_channel_settings`, `orders_raw`, `profit_settings`
**광고**: `ad_accounts`, `ad_spend_daily`
**운영**: `api_credentials`, `api_sync_logs`, `personal_tasks`, `profiles`, `notification_settings`

---

## 자주 사용하는 명령어
```bash
npm run dev                        # 개발 서버 실행
npm run build                      # 프로덕션 빌드 (tsc -b && vite build)
npm run lint                       # ESLint 검사
npx shadcn@latest add [name]       # shadcn 컴포넌트 추가
```

---

## 주의사항
1. **타입 안전성**: `any` 타입 사용 금지, 명시적 타입 정의
2. **에러 처리**: try-catch로 API 호출 감싸기
3. **상태 관리**: 전역 상태는 Zustand, 로컬 상태는 useState
4. **불변성**: 상태 업데이트 시 spread 연산자 사용
5. **일관성**: 새 UI 작성 전 shadcn/ui 컴포넌트 확인 필수
6. **브랜드 필터링**: 데이터 조회 시 반드시 brand 필터 적용
7. **Cafe24 OAuth**: state 파라미터에 `cafe24auth_브랜드ID` 형식 사용

---

## 인플루언서 시딩 기능

### 주요 파일
| 파일 | 설명 |
|------|------|
| `src/store/seedingStore.ts` | Zustand 스토어 (CRUD, 통계 계산, 1,412 lines) |
| `src/types/index.ts` | SeedingInfluencer, SeedingProject 타입 |
| `netlify/functions/google-sheets-sync.ts` | Google Sheets 연동 Netlify Function |
| `src/services/googleSheetsService.ts` | Sheets API 클라이언트 |
| `src/components/seeding/GoogleSheetsSync.tsx` | Sheets 동기화 UI |
| `src/pages/seeding/SeedingReportsPage.tsx` | 성과 리포트 (비용, 탑 인플루언서, 일별 차트) |
| `src/components/seeding/report/` | 리포트 서브컴포넌트 (6개) |

### Google Sheets 컬럼 매핑
시트 동기화 시 헤더명 → DB 필드 매핑:

```
Date → listed_at
Follower → follower_count
Following → following_count
E-mail → email
URL(youtube, instagram) → profile_url (account_id 자동 추출)
DM sent (Yes/No) → status 판별용 (dm발송)
Response received (Yes/No) → status 판별용 (응답)
acceptance (Yes/No) → status 판별용 (수락)
acceptance date → accepted_at (수락일자)
Product → product_name
price → product_price (가격)
Product Shipment (Yes/No) → status=shipped (발송)
upload date → posted_at (업로드 예정)
Upload completed date → completed_at (완료일)
NOTE → notes (비고)
Cost → product_price (fallback, price 필드 없을 때)
```

### 상단 탭 (SeedingStatusTabs) 매핑
- 연락완료 → DM발송 수 (contacted + accepted + rejected + shipped + guide_sent + posted + completed)
- 수락 → 응답 수 (accepted + shipped + guide_sent + posted + completed)
- 제품발송 → 발송 수 (shipped + guide_sent + posted + completed)
- 완료 → completed 수

### Google Sheets 동기화 UI
- **실시간 연동만 지원** (가져오기/내보내기/자동가져오기 제거)
- GoogleSheetsSync 모달: URL + 시트명 → 미리보기 → 동기화 실행

### 컬럼 매핑 추가 방법
`netlify/functions/google-sheets-sync.ts`의 `HEADER_MAP` 객체에 추가:
```ts
const HEADER_MAP: Record<string, string> = {
  '새컬럼명': 'db_field_name',
  'New Column': 'db_field_name',
  // ...
};
```

### 비용 계산 로직
- **발송완료 상태만 계산**: `shipped`, `guide_sent`, `posted`, `completed`
- 계산식: `수량 × (인플루언서별 product_price || 프로젝트 cost_price)`
- 위치: `seedingStore.ts` → `getProjectStats()`, `getOverallStats()`

### 시트 동기화 플로우
1. 기존 데이터 삭제 (deleteInfluencersByProject)
2. Netlify Function으로 시트 데이터 파싱
3. 프론트엔드에서 필드 매핑 + 정규화
4. DB에 새 데이터 추가 (addInfluencersBulk)

### 상태값 (SeedingStatus)
```
listed → 리스트업
contacted → 연락완료
accepted → 수락
rejected → 거절
shipped → 제품발송
guide_sent → 가이드발송
posted → 포스팅완료
completed → 완료
```

### DB 스키마 변경 시
1. `supabase/migrations/`에 SQL 파일 추가
2. Supabase SQL Editor에서 실행
3. `seedingStore.ts`의 `dbToInfluencer()`, `addInfluencer()`, `addInfluencersBulk()`, `updateInfluencer()` 수정
4. `src/types/index.ts`의 타입 업데이트

---

## ⚠️ SQL 작업 체크리스트 (필수!)

Claude는 Supabase SQL을 직접 실행할 수 없습니다. DB 관련 작업 시 반드시 아래 체크리스트를 따릅니다.

### SQL 실행이 필요한 작업
- [ ] 테이블 생성/삭제
- [ ] 컬럼 추가/삭제/타입 변경
- [ ] 인덱스 생성/삭제
- [ ] RLS 정책 추가/수정
- [ ] 데이터 마이그레이션

### 작업 프로세스
1. **SQL 제공**: 실행할 SQL 쿼리를 사용자에게 제공
2. **실행 요청**: "Supabase SQL Editor에서 실행해주세요" 명시
3. **실행 확인**: 사용자가 실행 완료했는지 확인
4. **결과 검증**: 변경사항이 제대로 적용되었는지 확인 요청

### 예시
```
⚠️ SQL 실행 필요:
아래 쿼리를 Supabase SQL Editor에서 실행해주세요:

\`\`\`sql
ALTER TABLE seeding_influencers
ALTER COLUMN completed_at TYPE date;
\`\`\`

실행 완료되면 알려주세요.
```

---

## NCP 프록시 서버 (API 연동 백엔드)

### 서버 정보
| 항목 | 값 |
|------|-----|
| 플랫폼 | Naver Cloud Platform (NCP) |
| 서버 이름 | howpapaop (127178290) |
| OS | Ubuntu 24.04 |
| 스펙 | m1-g3 (vCPU 1EA, Memory 1GB) |
| 공인 IP | 49.50.131.90 |
| 관리자 | root |
| 인증키 | howpapa-key |
| 서비스 포트 | 3100 |

### 서버 접속
```bash
ssh root@49.50.131.90
# 비밀번호는 사용자에게 확인
```

### 프록시 구조
```
프론트엔드 (Netlify)
    ↓ fetch
Netlify Functions (commerce-proxy.ts)
    ↓ x-api-key 헤더로 인증
NCP 프록시 서버 (49.50.131.90:3100)
    ↓ 고정 IP에서 API 호출
외부 API (Naver, Cafe24, Coupang 등)
```

### 주요 파일
| 위치 | 설명 |
|------|------|
| `naver-proxy/server.js` | 프록시 서버 코드 (Express.js) |
| `naver-proxy/package.json` | 의존성 (express, cors, helmet, rate-limit, bcryptjs) |
| `naver-proxy/setup.sh` | 서버 최초 셋업 스크립트 |

### 서버 배포 경로
- 앱 디렉토리: `/opt/naver-proxy/`
- 환경변수: `/opt/naver-proxy/.env`
- systemd 서비스: `naver-proxy.service`

### 엔드포인트
| 메서드 | 경로 | 인증 | 용도 |
|--------|------|------|------|
| GET | `/health` | 불필요 | 헬스체크 |
| POST | `/naver/token` | API Key | Naver Commerce 토큰 발급 |
| POST | `/api/naver/test` | API Key | 네이버 연결 테스트 (토큰 발급 검증) |
| POST | `/api/naver/sync` | API Key | 네이버 주문 동기화 (토큰→주문ID→상세조회 일괄) |
| ALL | `/naver/api/*` | API Key | Naver Commerce API 범용 프록시 |
| POST | `/cafe24/orders` | API Key | Cafe24 주문 조회 (페이지네이션 전체 처리) |
| POST | `/cafe24/test` | API Key | Cafe24 연결 테스트 |
| POST | `/proxy` | API Key | 범용 프록시 (Coupang 등) |

### 인증
- 헤더: `x-api-key` 또는 `x-proxy-api-key` (둘 다 허용)
- 키: 환경변수 `PROXY_API_KEY` (`.env`에 설정)
- Netlify 환경변수: `NAVER_PROXY_API_KEY`
- **중요**: 네이버 Commerce API는 등록된 고정 IP에서만 호출 가능 → 반드시 NCP 프록시 경유

### 서버 배포 방법
```bash
# NCP 서버에 SSH 접속 후:
cd /opt/naver-proxy
# GitHub에서 최신 server.js 다운로드
curl -o server.js "https://raw.githubusercontent.com/howpapa-sky/operation_20251207/main/naver-proxy/server.js"
# 서비스 재시작
systemctl restart naver-proxy
# 상태 확인
systemctl status naver-proxy
journalctl -u naver-proxy --no-pager -n 20
```

### 서버 관리 명령어
```bash
systemctl status naver-proxy     # 상태 확인
systemctl restart naver-proxy    # 재시작
systemctl stop naver-proxy       # 중지
journalctl -u naver-proxy -f     # 실시간 로그
```

### 주의사항
1. **ACG(방화벽)**: NCP ACG에서 포트 3100 인바운드 허용 필요
2. **Claude는 SSH 직접 접속 불가**: ACG가 Claude 실행 환경 IP를 차단하므로, 서버 배포는 사용자가 직접 실행
3. **server.js 수정 후**: 반드시 NCP 서버에 배포 + `systemctl restart naver-proxy` 필요
4. **환경변수 변경**: `/opt/naver-proxy/.env` 수정 후 서비스 재시작

### Cafe24 API 참고
- API 버전: `2025-12-01` (X-Cafe24-Api-Version 헤더)
- 주문 조회 최대 범위: 6개월 (프론트엔드에서 30일 단위로 분할)
- 주문 페이지네이션: offset 기반, limit 최대 100
- OAuth scope: `mall.read_application,mall.write_application,mall.read_category,mall.read_product,mall.read_personal,mall.read_order,mall.read_community,mall.read_store,mall.read_salesreport,mall.read_shipping,mall.read_analytics`
- OAuth state 형식: `cafe24auth` 또는 `cafe24auth_브랜드ID`

---

## 주문 동기화 시스템

### 아키텍처 (중요!)
```
브라우저 (React)
  ↓ orderSyncService.ts (날짜 범위를 청크로 분할)
Netlify Functions (commerce-proxy.ts)
  ↓ x-api-key 헤더로 인증
NCP 프록시 서버 (49.50.131.90:3100, naver-proxy/server.js)
  ↓ 고정 IP에서 API 호출
외부 API (Naver Commerce, Cafe24, Coupang)
```

### 핵심 파일
| 파일 | 설명 |
|------|------|
| `src/services/orderSyncService.ts` | 프론트엔드 동기화 서비스 (청크 분할, 진행률 콜백) |
| `src/components/sales/OrderSyncPanel.tsx` | 동기화 UI (경과시간, 진행바, 결과 표시) |
| `netlify/functions/commerce-proxy.ts` | Netlify → NCP 프록시 중계 함수 (77KB, 전 채널 통합) |
| `naver-proxy/server.js` | NCP 프록시 서버 (실제 배포 코드) |
| `src/hooks/useAutoSync.ts` | 자동 동기화 훅 (최근 3일) |

### 채널별 청크 크기
- **네이버 스마트스토어**: 14일 단위 (Netlify 10초 타임아웃 대비)
- **카페24**: 30일 단위
- **쿠팡**: 30일 단위

### 네이버 스마트스토어 주문 동기화 플로우
1. NCP 프록시에서 bcrypt 서명 생성 → 토큰 발급
2. `last-changed-statuses` API로 변경된 주문 productOrderId 목록 수집 (페이지네이션)
3. `product-orders/query` API로 상세 조회 (300건씩 배치)
4. 결과를 Netlify Function → 프론트엔드로 반환
5. 프론트엔드에서 orders_raw 테이블에 upsert

### 네이버 IP 제한 (절대 변경 금지!)
- 네이버 Commerce API는 등록된 고정 IP에서만 호출 가능
- NCP 서버(49.50.131.90)의 IP가 네이버에 등록되어 있음
- Netlify에서 직접 네이버 API를 호출하면 IP 차단됨
- 반드시 NCP 프록시를 경유해야 함

---

## 매출 관리 시스템

### 주요 파일
| 파일 | 설명 |
|------|------|
| `src/pages/SalesDashboardPage.tsx` | 매출 분석 대시보드 (채널 성과, 트렌드, 비교) |
| `src/store/salesDashboardStore.ts` | 대시보드 데이터 스토어 (607 lines) |
| `src/store/useSalesStore.ts` | 매출 운영 스토어 (494 lines) |
| `src/pages/OrdersListPage.tsx` | 주문서 전체목록 (필터, 내보내기) |
| `src/pages/SalesCostInputPage.tsx` | 원가 입력 (orders_raw 연동) |
| `src/pages/SalesChannelSettingsPage.tsx` | 채널별 수수료/설정 |
| `src/pages/SalesProfitSettingsPage.tsx` | 이익 계산 설정 |
| `src/components/sales/OrderSyncPanel.tsx` | 주문 동기화 UI |
| `src/components/sales/ProfitBreakdownCard.tsx` | 3단계 이익 시각화 |
| `src/components/sales/ChannelSummaryCard.tsx` | 채널별 매출 요약 |
| `src/components/dashboard/MultiBrandDashboard.tsx` | 멀티 브랜드 대시보드 |

### DB 테이블
- `orders_raw`: 주문 원시 데이터 (채널별 수집, brand 필터)
- `api_credentials`: API 인증정보 + 동기화 상태 (brand_id별)
- `sku_master`: SKU 코드, 원가, 판매가
- `sku_cost_history`: 원가 변경 이력
- `sales_channel_settings`: 채널 수수료율
- `profit_settings`: 이익 계산 규칙

### 3단계 이익 분석
1. **매출총이익** = 매출 - 매출원가
2. **영업이익** = 매출총이익 - 판매관리비 - 광고비
3. **순이익** = 영업이익 - 기타비용

---

## 광고비 관리 시스템

### 주요 파일
| 파일 | 설명 |
|------|------|
| `src/store/useAdAccountStore.ts` | 광고 계정 관리 스토어 (284 lines) |
| `src/services/adSyncService.ts` | 광고 플랫폼 동기화 (172 lines) |
| `src/types/ecommerce.ts` | AdPlatform, AdAccount, AdSpendDaily 타입 |

### 지원 플랫폼
- **Naver SA** (검색광고)
- **Naver GFA** (디스플레이광고)
- **Meta** (Facebook/Instagram)
- **Coupang Ads**

### DB 테이블
- `ad_accounts`: 광고 계정 정보 (플랫폼, 브랜드별)
- `ad_spend_daily`: 일별 광고비 (매체별 비용, 클릭, 노출)

### 광고 API 호출 방식
- NCP 프록시 불필요 → Netlify Functions에서 직접 호출

---

## Netlify Functions (18개)

### 핵심 프록시
| 함수 | 설명 |
|------|------|
| `commerce-proxy.ts` | 전 채널 통합 프록시 (Naver, Cafe24, Coupang, Cafe24 OAuth) |

### 주문 동기화
| 함수 | 설명 |
|------|------|
| `naver-smartstore-sync.ts` | 스마트스토어 전용 동기화 |
| `naver-api-test.ts` | 네이버 API 연결 테스트 |
| `scheduled-sync.ts` | 스케줄 주문 동기화 |

### Google Sheets
| 함수 | 설명 |
|------|------|
| `google-sheets-sync.ts` | 시딩 시트 동기화 |
| `scheduled-sheets-sync.ts` | 스케줄 시트 동기화 |
| `sheets-webhook.ts` | 시트 변경 웹훅 |

### 리포트 & 알림 (스케줄)
| 함수 | 스케줄 | 설명 |
|------|--------|------|
| `daily-seeding-report.ts` | 매일 10:00 | 일일 시딩 KPI 리포트 |
| `seeding-kpi-alert.ts` | 매일 6:00, 9:00 | 시딩 KPI 예외 알림 |
| `daily-alert-check.ts` | 매일 00:00 | 알림 규칙 체크 |
| `weekly-report.ts` | 매주 월 00:00 | 주간 리포트 |
| `monthly-report.ts` | 매월 1일 01:00 | 월간 리포트 |

### 알림 발송
| 함수 | 설명 |
|------|------|
| `daily-reminder.js` | 일일 리마인더 |
| `daily-report.js` | 레거시 일일 리포트 |
| `test-report.js` | 테스트 리포트 |
| `notify-assignee.js` | 담당자 알림 |
| `send-email.js` | 이메일 발송 |
| `send-naver-works.js` | 네이버웍스 알림 |

---

## 환경변수

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
NAVER_PROXY_URL=http://49.50.131.90:3100
NAVER_PROXY_API_KEY=howpapa-naver-proxy-2024-secret
```

---

## DB 마이그레이션 (12개)

| 파일 | 설명 |
|------|------|
| `001_seeding_tables.sql` | 코어 시딩 테이블 (product_guides, seeding_projects, seeding_influencers, outreach_templates) |
| `002_add_sheet_urls.sql` | 시딩 프로젝트에 Google Sheets URL |
| `003_add_product_fields.sql` | 제품 관련 컬럼 |
| `004_dev_requests.sql` | 개발 요청 테이블 |
| `005_add_influencer_fields.sql` | 인플루언서 메타데이터 필드 |
| `005_add_following_count.sql` | following_count 컬럼 |
| `006_add_sheet_sync_settings.sql` | 시트 동기화 설정 |
| `007_add_evaluation_criteria_display_order.sql` | 평가 항목 순서 |
| `008_ecommerce_profitability.sql` | 이커머스 스키마 (SKU, 채널, 주문, 이익) |
| `009_multi_brand_advertising.sql` | 광고 계정 및 지출 추적 |
| `010_brand_unique_constraint.sql` | 브랜드 제약 조건 |
| `010_unify_brand_nucio.sql` | nuccio → nucio 브랜드명 통일 |

---

## ⛔ 변경 금지 코드 (정상 작동 확인된 코드)

아래 코드는 실제 운영에서 정상 작동이 확인된 코드입니다.
**전체 구조 리뉴얼이 아닌 이상 절대 수정하지 마세요.**
부분 수정 시에도 아래 항목은 반드시 원본 값을 유지해야 합니다.

### 1. 네이버 커머스 API 엔드포인트 URL
```
토큰 발급:   https://api.commerce.naver.com/external/v1/oauth2/token
주문상태조회: https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses
주문상세조회: https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query
```
- ⚠️ `product-orders` ← 이것이 정확합니다. `orders`로 바꾸면 404 발생!

### 2. 네이버 토큰 생성 공식
```javascript
// 반드시 이 순서: bcrypt → Base64
hashedSign = bcrypt.hashSync(clientId + '_' + timestamp, clientSecret);
base64Sign = Buffer.from(hashedSign).toString('base64');
// client_secret_sign에 base64Sign을 전달
```
- ⚠️ Base64 인코딩을 빼면 `client_secret_sign 항목이 유효하지 않습니다` 에러 발생

### 3. NCP 프록시 인증 헤더
```javascript
// 반드시 둘 다 허용 (하위 호환)
const apiKey = req.headers['x-api-key'] || req.headers['x-proxy-api-key'];
```

### 4. 코드 수정 시 체크리스트
- [ ] 수정 대상이 아닌 URL/경로가 변경되지 않았는지 diff 확인
- [ ] 기존에 작동하던 함수의 시그니처가 바뀌지 않았는지 확인
- [ ] 리팩터링 시 기존 로직을 축약하면서 값이 바뀌지 않았는지 확인

---

## 🔴 오류 이력 (동일 실수 방지용)

| # | 날짜 | 오류 | 원인 | 교훈 |
|---|------|------|------|------|
| 1 | 2026-02-01 | `client_secret_sign 항목이 유효하지 않습니다` | bcrypt 해시를 Base64 인코딩 없이 전송 | 네이버 API 공식: `Base64(bcrypt(password, salt))` |
| 2 | 2026-02-01 | 주문 동기화 404 | 인증 헤더 수정 중 URL을 `product-orders` → `orders`로 실수 변경 | **수정 대상이 아닌 코드를 건드리지 말 것.** diff로 반드시 확인 |
| 3 | 2026-02-01 | NCP EADDRINUSE | 이전 프로세스가 포트 3100 점유 | 배포 시 `fuser -k 3100/tcp` 먼저 실행 |
| 4 | 2026-02-01 | Unauthorized 401 | NCP 서버가 `x-api-key`만 허용, Netlify는 `x-proxy-api-key` 전송 | 인증 헤더 양쪽 모두 허용 |
| 5 | 2026-02-01 | 504 Timeout | NCP에 `/api/naver/sync` 엔드포인트 없음 | 프론트→Netlify→NCP 전체 경로 확인 필수 |
| 6 | 2026-02 | 브랜드명 불일치 | DB에 'nuccio'로 저장, 코드에서 'nucio'로 조회 | 브랜드명은 반드시 'howpapa' 또는 'nucio' 사용 |
| 7 | 2026-02 | 광고비 미표시 | adSyncService가 NCP 프록시 경유 시 실패 | 광고 API는 직접 호출 (NCP 프록시 불필요) |
| 8 | 2026-02 | fetchInfluencers 데이터 누락 | Supabase 기본 1000건 limit | cursor-based pagination으로 전체 데이터 로드 |

---

## 최근 변경 이력 (세션간 컨텍스트 보존)

### 2026-02-09: 시딩 성과 리포트 + 광고비 연동 수정
- `fetchInfluencers`: cursor-based pagination으로 전체 데이터 로드
- 시딩 성과 리포트 연동 문제 수정
- 광고비 미표시 근본 원인 수정 (NCP 프록시 → 직접 호출 전환)
- 브랜드명 `nuccio` → `nucio` 전체 코드베이스 + DB 통일

### 2026-02-초: 매출 대시보드 대폭 개선 + 멀티 브랜드
- 매출 대시보드 UI 리디자인 (채널 성과, 트렌드 차트, 비교 테이블)
- MultiBrandDashboard 컴포넌트 (채널별 매출, 광고비 통합 뷰)
- 브랜드별 API 자격증명 필터링
- Cafe24 OAuth: state 기반 브랜드 핸들링
- 광고 계정 관리 (Naver SA/GFA, Meta, Coupang Ads)
- 쿠팡 WING API 연동

### 2026-02-01: 스마트스토어 주문 수집 504 타임아웃 해결 + 동기화 UX 개선
- NCP 서버에 `/api/naver/test`, `/api/naver/sync` 엔드포인트 추가
- 인증 헤더 `x-proxy-api-key` → `x-api-key` 통일 + 둘 다 허용
- 전 채널 날짜 범위 청크 분할 (14일/30일)
- OrderSyncPanel 경과시간 표시, 진행바

### 2026-02-01: 주문서 전체목록 + 원가 입력 + SKU 원가 대시보드
- OrdersListPage: 주문서 전체목록 페이지 신규
- SalesCostInputPage: orders_raw 테이블 직접 연동
- salesDashboardStore: SKU 원가 반영한 이익 계산

### 2026-01-31: 매출 관리 시스템 3단계 이익 분석
- 매출총이익, 영업이익, 순이익 3단계 분석
- 채널별 수익성 대시보드
- Cafe24 연동 (OAuth + 주문 동기화)
