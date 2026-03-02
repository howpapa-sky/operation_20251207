# 하우파파 & 누치오 업무관리 시스템 - 전체 데이터 문서

> 생성일: 2026-03-02
> 시스템명: Howpapa & Nucio Operation System
> 배포: Netlify (프론트엔드) + Supabase (백엔드) + NCP (프록시 서버)

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [브랜드 정보](#3-브랜드-정보)
4. [디렉토리 구조](#4-디렉토리-구조)
5. [라우트 (페이지) 구조](#5-라우트-페이지-구조)
6. [페이지별 기능 상세](#6-페이지별-기능-상세)
7. [데이터베이스 스키마](#7-데이터베이스-스키마)
8. [타입 정의](#8-타입-정의)
9. [Zustand 스토어](#9-zustand-스토어)
10. [서비스 (API 클라이언트)](#10-서비스-api-클라이언트)
11. [Netlify Functions (서버리스)](#11-netlify-functions-서버리스)
12. [NCP 프록시 서버](#12-ncp-프록시-서버)
13. [데이터 플로우](#13-데이터-플로우)
14. [환경변수](#14-환경변수)
15. [오류 방지 가이드](#15-오류-방지-가이드)
16. [알려진 이슈](#16-알려진-이슈)
17. [변경 이력](#17-변경-이력)

---

## 1. 시스템 개요

하우파파(howpapa)와 누치오(nucio) 두 화장품 브랜드의 통합 운영 관리 시스템.

**핵심 기능:**
- **인플루언서 시딩** - 리스트업, DM 발송, 수락, 제품 발송, 포스팅 추적
- **프로젝트 관리** - 샘플링, 상세페이지, 인플루언서, 제품주문, 공동구매, 기타
- **매출 분석** - 채널별 매출, 3단계 이익 분석, 트렌드
- **주문 동기화** - 네이버 스마트스토어, 카페24, 쿠팡 주문 자동 수집
- **광고비 관리** - 네이버 SA/GFA, Meta, 쿠팡 광고
- **SKU/원가 관리** - 제품 원가, 판매가, 변경 이력
- **알림/리포트** - 네이버웍스, 이메일 자동 발송

---

## 2. 기술 스택

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
| 라우팅 | react-router-dom | 7.10 |
| UUID | uuid | 13.0 |

### 주요 Dependencies

```json
{
  "@fullcalendar/daygrid": "^6.1.19",
  "@fullcalendar/interaction": "^6.1.19",
  "@fullcalendar/react": "^6.1.19",
  "@headlessui/react": "^2.2.9",
  "@netlify/functions": "^5.1.2",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.2.15",
  "@supabase/supabase-js": "^2.86.2",
  "bcryptjs": "^2.4.3",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "date-fns": "^4.1.0",
  "googleapis": "^169.0.0",
  "lucide-react": "^0.556.0",
  "nodemailer": "^7.0.11",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.10.1",
  "recharts": "^3.5.1",
  "tailwind-merge": "^3.4.0",
  "zustand": "^5.0.9"
}
```

---

## 3. 브랜드 정보

| 브랜드 | 코드 | 한국어명 | Primary Color | 용도 |
|--------|------|----------|---------------|------|
| howpapa | `howpapa` | 하우파파 | `#f97316` (orange-500) | 메인 브랜드 |
| nucio | `nucio` | 누치오 | `#22c55e` (green-500) | 서브 브랜드 |

- 모든 DB 테이블에 `brand` 컬럼 존재
- `brandStore.ts`에서 현재 선택된 브랜드 관리
- 각 스토어에서 브랜드별 데이터 필터링

---

## 4. 디렉토리 구조

```
src/
├── components/
│   ├── ui/              # shadcn/ui 컴포넌트 (14개)
│   ├── common/          # 커스텀 공통 컴포넌트 (16개)
│   ├── layout/          # Layout, Header, Sidebar
│   ├── seeding/         # 시딩 관련 (27개, report/ 하위 포함)
│   ├── dashboard/       # SeedingKPICard, MultiBrandDashboard
│   ├── sales/           # OrderSyncPanel, ProfitBreakdownCard, ChannelSummaryCard
│   ├── projects/        # 프로젝트 관리 + views/
│   └── products/        # ProductMasterDetail, ProductMasterForm
├── pages/               # 페이지 컴포넌트 (26개 + seeding/ 8개)
│   └── seeding/         # 시딩 관련 페이지
├── store/               # Zustand 스토어 (18개, ~7,088 lines)
├── services/            # API/비즈니스 서비스 (4개)
├── lib/                 # supabase.ts, utils.ts, sendEmail.ts, sendNaverWorks.ts, apiErrorHandler.ts, envCheck.ts
├── utils/               # helpers.ts (포맷팅, 상태 레이블, 변환, exportToCSV)
├── types/               # 타입 정의 (3개, ~2,596 lines)
└── hooks/               # use-toast.ts, useAutoSync.ts

netlify/functions/       # Netlify 서버리스 함수 (18개)
naver-proxy/             # NCP Express 프록시 서버
supabase/
├── migrations/          # DB 마이그레이션 (12개)
└── functions/           # Supabase Edge Functions (3개)
```

---

## 5. 라우트 (페이지) 구조

### 5.1 Public (인증 불필요)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/login` | LoginPage | 로그인 |
| `/register` | RegisterPage | 회원가입 |
| `/g/:slug` | ProductGuidePublicPage | 공개 제품 가이드 링크 |
| `/auth/cafe24` | Cafe24CallbackPage | Cafe24 OAuth 콜백 |

### 5.2 Protected (인증 필요)

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

### 5.3 시딩 (Seeding)

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

## 6. 페이지별 기능 상세

### 6.1 대시보드 (`/`)
- 전체 프로젝트 KPI 카드 (총 프로젝트, 완료, 진행중, 보류)
- 프로젝트 타입별 분포 파이 차트
- 월별 프로젝트 트렌드 라인 차트
- FullCalendar 일정 캘린더
- 시딩 KPI 카드 (하우파파/누치오 별도)
- 다가오는 마감일 (D-day)
- 지연 프로젝트 목록
- 최근 프로젝트 테이블
- 빠른 프로젝트 생성 버튼

### 6.2 매출 대시보드 (`/sales-dashboard`)
- 멀티브랜드 토글 (howpapa ↔ nucio)
- 채널별 성과 카드 (매출, 마진, ROI)
- 일별 트렌드 Area 차트
- 채널 비교 테이블 (전기 대비)
- **3단계 이익 분석:**
  1. 매출총이익 = 매출 - 매출원가
  2. 영업이익 = 매출총이익 - 판관비 - 광고비
  3. 순이익 = 영업이익 - 고정비
- 실시간 주문 동기화 (진행바, 경과시간)
- KPI 지표 (일매출, 광고비, 평균 주문가)

### 6.3 주문서 전체목록 (`/sales/orders`)
- 날짜 범위 필터 (기본: 최근 6일)
- 채널/검색어 필터
- 테이블: 날짜, 주문ID, 상태, 브랜드, 채널, 제품명, 옵션명, 매출, 결제, 수량
- 페이지네이션 (20/50/100건)
- 벌크 선택 및 삭제
- CSV 엑셀 다운로드

### 6.4 원가 입력 (`/sales/costs`)
- 주문 데이터에서 유니크 제품+옵션 추출
- 인라인 원가 편집
- SKU 마스터 데이터 크로스 레퍼런스
- CSV 업로드로 벌크 업데이트
- 이익 자동 재계산

### 6.5 채널 설정 (`/sales/channels`)
- 채널별 수수료율(%) 설정
- 기본 배송비(원) 설정
- 채널 활성/비활성 토글
- 마지막 동기화 시간 표시

### 6.6 이익 계산 설정 (`/sales/profit-settings`)
- **부가세 탭**: VAT 적용 여부, VAT율 (기본 10%)
- **판관비 탭**: 항목별 비율(%) 또는 건당 고정비
- **고정비 탭**: 월정액 비용 항목 (임대료, 인건비 등)

### 6.7 SKU 마스터 (`/products`)
- 통계 카드: 총 SKU, 브랜드별 분포, 재고 가치
- 검색/필터 (SKU코드, 제품명, 바코드, 브랜드, 카테고리)
- SKU 테이블: 코드, 제품명, 브랜드, 카테고리, 원가, 판매가, 마진율
- 생성/수정 모달
- 원가 변경 이력 조회
- 채널별 옵션 매핑
- CSV 템플릿 다운로드 / 데이터 내보내기 / 벌크 업로드

### 6.8 통계 (`/statistics`)
- 기간 필터 (전체/30/90/180/365일)
- 프로젝트 타입별 파이 차트
- 상태별 분포, 월별 추이
- 예산 활용도 게이지
- 우선순위 분포
- CSV 내보내기

### 6.9 프로모션 (`/promotion`)
- 프로모션 목록 (예정/진행중/종료)
- 프로모션 팩 (제품 번들) 관리
- 정가/프로모션가/할인율 설정
- 날짜 기반 자동 상태 변경

### 6.10 설정 (`/settings`) - 7개 탭
1. **프로필** - 이름, 이메일, 비밀번호
2. **평가 기준** - 드래그 정렬 평가 항목
3. **프로젝트 타입** - 표시/숨김, 워크플로우
4. **프로젝트 필드** - 커스텀 필드 (text/select/date/checkbox)
5. **API 자격증명** - 네이버/카페24/쿠팡/구글시트 키
6. **알림** - 알림 규칙, 임계값, 이메일/네이버웍스
7. **사용자 관리** - 역할 기반 권한 (RBAC)

### 6.11 시딩 프로젝트 (`/seeding`)
- 통계 카드: 전체/활성/기획/완료
- 프로젝트 카드 (KPI 프리뷰)
- 생성/수정/복제 모달
- 브랜드/상태 필터

### 6.12 시딩 리스트 (`/seeding/list/:projectId?`)
- 프로젝트 선택 드롭다운
- 상태 탭 (연락완료, 수락, 발송, 완료 등)
- 인플루언서 테이블 (프로필, 팔로워, 상태, 비용, 완료일)
- 필터: 상태, 시딩타입, 콘텐츠타입, 날짜
- 벌크 작업 (삭제, 상태 변경)
- 상세 사이드 패널
- Google Sheets 동기화 모달
- CSV 내보내기

### 6.13 아웃리치 (`/seeding/outreach`)
- DM/이메일 템플릿 카드
- 변수 삽입: {{name}}, {{product}}, {{follower_count}}, {{cost}}, {{deadline}}
- 클립보드 복사
- 사용 횟수 추적

### 6.14 배송 추적 (`/seeding/shipping`)
- 3개 탭: 대기/배송중/완료
- 배송 테이블 (택배사, 송장번호, 발송일, 수령일)
- 벌크 송장 입력 모달

### 6.15 제품 가이드 (`/seeding/guides`)
- 가이드 카드 (제품명, 브랜드, 콘텐츠 타입, 공개 링크)
- 생성/편집 (키포인트, 해시태그, 멘션, DOs/DON'Ts)
- 공개/비공개 토글
- 커스텀 슬러그 URL

### 6.16 시딩 리포트 (`/seeding/reports`)
- 날짜 범위, 프로젝트, 브랜드 필터
- 비용 분석 (제품원가, 배송비, 인플루언서 비용)
- 일별 포스팅 라인 차트
- 콘텐츠/시딩 타입 분포 파이 차트
- 탑 인플루언서 테이블
- PDF 내보내기 (브라우저 인쇄)

---

## 7. 데이터베이스 스키마

### 7.1 테이블 전체 목록

| # | 테이블명 | 설명 | 주요 컬럼 |
|---|----------|------|-----------|
| 1 | `brands` | 브랜드 마스터 | code, name, display_name, primary_color, logo_url |
| 2 | `profiles` | 사용자 프로필 | email, name, role, avatar_url |
| 3 | `projects` | 프로젝트 | title, type, status, priority, start_date, target_date, data(JSONB) |
| 4 | `evaluation_criteria` | 평가 기준 | name, description, category, max_score, display_order |
| 5 | `products` | 제품 마스터 (레거시) | name, brand, category, sku, cost_price, selling_price |
| 6 | `sales_records` | 매출 기록 (레거시) | date, channel, product_id, quantity, unit_price, total_revenue, profit |
| 7 | `api_credentials` | API 인증정보 | channel, brand_id, cafe24/naver/coupang 자격증명, sync_status |
| 8 | `api_sync_logs` | 동기화 로그 | channel, sync_type, status, records_fetched/created/updated |
| 9 | `project_type_settings` | 프로젝트 타입 설정 | project_type, is_visible, display_order, custom_name |
| 10 | `notification_settings` | 알림 설정 | dday_email_enabled, dday_days_before, naver_works_enabled |
| 11 | `project_field_settings` | 프로젝트 커스텀 필드 | project_type, field_key, field_label, field_type, field_options |
| 12 | `seeding_projects` | 시딩 프로젝트 | name, brand, product_name, target_count, cost_price, selling_price |
| 13 | `seeding_influencers` | 시딩 인플루언서 | account_id, platform, follower_count, status, shipping(JSONB), performance(JSONB) |
| 14 | `outreach_templates` | 아웃리치 템플릿 | name, content, seeding_type, content_type, brand, variables |
| 15 | `product_guides` | 제품 가이드 | product_name, brand, key_points, hashtags, dos, donts, public_slug |
| 16 | `sku_master` | SKU 마스터 | sku_code, product_name, brand, cost_price, selling_price, barcode |
| 17 | `sku_cost_history` | 원가 변경 이력 | sku_id, previous_cost, new_cost, change_reason, effective_date |
| 18 | `channel_option_mapping` | 채널 옵션 매핑 | sku_id, channel, option_name, channel_product_id |
| 19 | `sales_channel_settings` | 채널 수수료 설정 | channel, channel_name, fee_rate, shipping_fee |
| 20 | `orders_raw` | 주문 원시 데이터 | channel, order_id, order_date, product_name, quantity, total_price, profit |
| 21 | `daily_channel_stats` | 일별 채널 통계 | date, channel, brand, total_orders, total_revenue, gross_profit |
| 22 | `ad_accounts` | 광고 계정 | brand_id, platform, 플랫폼별 자격증명 |
| 23 | `ad_spend_daily` | 일별 광고비 | brand_id, date, platform, spend, impressions, clicks, roas |
| 24 | `ad_performance` | 광고 성과 | date, channel, campaign_id, impressions, clicks, cost, conversions |
| 25 | `daily_ad_stats` | 일별 광고 통계 | date, channel, total_impressions, total_clicks, total_cost, overall_roas |
| 26 | `group_purchase_rounds` | 공동구매 라운드 | round_number, title, brand, influencer_name, total_revenue |
| 27 | `group_purchase_sets` | 공동구매 세트 | round_id, set_name, regular_price, sale_price, stock_quantity |
| 28 | `group_purchase_set_items` | 세트 구성 아이템 | set_id, sku_id, quantity |
| 29 | `group_purchase_events` | 공동구매 이벤트 | round_id, event_type, title, description |
| 30 | `daily_report_settings` | 리포트 발송 설정 | report_type, is_active, send_time, recipients |
| 31 | `daily_report_logs` | 리포트 발송 로그 | report_type, report_date, status, recipients_count |
| 32 | `exchange_rates` | 환율 | currency, rate, effective_date |
| 33 | `dev_requests` | 개발 요청서 | requester, brand, request_type, title, priority, status |

### 7.2 주요 테이블 상세 스키마

#### `seeding_projects`
```sql
CREATE TABLE seeding_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nucio')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200),
  start_date DATE,
  end_date DATE,
  target_count INTEGER DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'planning',
  description TEXT,
  assignee_id UUID REFERENCES profiles(id),
  listup_sheet_url TEXT,
  listup_sheet_name VARCHAR(100) DEFAULT 'Sheet1',
  auto_sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `seeding_influencers`
```sql
CREATE TABLE seeding_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seeding_projects(id) ON DELETE CASCADE,
  account_id VARCHAR(100) NOT NULL,
  account_name VARCHAR(200),
  platform VARCHAR(20) DEFAULT 'instagram',
  email VARCHAR(200),
  phone VARCHAR(50),
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  category VARCHAR(100),
  profile_url TEXT,
  listed_at DATE,
  seeding_type VARCHAR(10) DEFAULT 'free',
  content_type VARCHAR(20) DEFAULT 'story',
  fee DECIMAL(10,2) DEFAULT 0,
  product_name VARCHAR(200),
  product_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'listed',
  shipping JSONB DEFAULT '{"recipient_name":"","phone":"","address":"","postal_code":"","quantity":1,"carrier":"","tracking_number":"","shipped_at":null,"delivered_at":null}',
  guide_id UUID REFERENCES product_guides(id),
  guide_sent_at TIMESTAMPTZ,
  guide_link TEXT,
  posting_url TEXT,
  posted_at TIMESTAMPTZ,
  performance JSONB DEFAULT '{"views":null,"likes":null,"comments":null,"saves":null,"shares":null,"story_views":null,"link_clicks":null,"screenshot_urls":[],"measured_at":null}',
  contacted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  assignee_id UUID REFERENCES profiles(id),
  sheet_row_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders_raw`
```sql
CREATE TABLE orders_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  order_datetime TIMESTAMPTZ,
  product_name VARCHAR(300),
  option_name VARCHAR(300),
  sku_id UUID REFERENCES sku_master(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  channel_fee DECIMAL(10,2) DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  order_status VARCHAR(50),
  buyer_name VARCHAR(100),
  buyer_phone VARCHAR(50),
  shipping_address TEXT,
  currency VARCHAR(10) DEFAULT 'KRW',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  raw_data JSONB,
  brand_id UUID REFERENCES brands(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel, order_id)
);
```

#### `sku_master`
```sql
CREATE TABLE sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  brand VARCHAR(20) NOT NULL CHECK (brand IN ('howpapa', 'nucio')),
  category VARCHAR(50),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  barcode VARCHAR(50),
  supplier VARCHAR(100),
  min_stock INT DEFAULT 0,
  current_stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ad_accounts`
```sql
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'never',
  sync_error TEXT,
  -- Naver SA
  naver_customer_id VARCHAR(100),
  naver_api_key VARCHAR(200),
  naver_secret_key TEXT,
  -- Naver GFA
  naver_gfa_customer_id VARCHAR(100),
  naver_gfa_api_key VARCHAR(200),
  naver_gfa_secret_key TEXT,
  -- Meta
  meta_app_id VARCHAR(100),
  meta_app_secret TEXT,
  meta_access_token TEXT,
  meta_token_expires_at TIMESTAMPTZ,
  meta_ad_account_id VARCHAR(100),
  meta_business_id VARCHAR(100),
  -- Coupang Ads
  coupang_ads_vendor_id VARCHAR(100),
  coupang_ads_access_key VARCHAR(200),
  coupang_ads_secret_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);
```

#### `ad_spend_daily`
```sql
CREATE TABLE ad_spend_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  spend DECIMAL(15,2) NOT NULL DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  conversion_value DECIMAL(15,2) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(10,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, date, platform)
);
```

### 7.3 DB Views

#### `seeding_project_stats`
- 프로젝트별 인플루언서 상태 카운트, 비용, 도달/인게이지먼트 집계

#### `brand_profit_summary`
- 브랜드별 일별 매출, 원가, 채널수수료, 배송비, 광고비, 매출총이익

### 7.4 인덱스

총 40개 이상의 인덱스:
- `idx_seeding_projects_brand`, `idx_seeding_projects_status`
- `idx_seeding_influencers_project`, `idx_seeding_influencers_status`
- `idx_orders_raw_date`, `idx_orders_raw_channel`, `idx_orders_raw_brand_date`
- `idx_ad_spend_daily_brand_date`, `idx_ad_spend_daily_platform`
- `idx_sku_master_brand`, `idx_sku_master_sku_code`
- 등

### 7.5 RLS (Row Level Security)

- `seeding_projects` → 인증된 사용자 전체 접근
- `seeding_influencers` → 인증된 사용자 전체 접근
- `outreach_templates` → 인증된 사용자 전체 접근
- `product_guides` → 인증된 사용자 전체 접근 + 비인증 공개 읽기 (`is_public = true`)
- `dev_requests` → 전체 접근
- `ad_accounts` → 전체 접근
- `ad_spend_daily` → SELECT/INSERT/UPDATE 허용

### 7.6 기본 데이터

| 테이블 | 기본값 |
|--------|--------|
| `brands` | howpapa (하우파파, #f97316), nucio (누치오, #22c55e) |
| `sales_channel_settings` | smartstore 5.5%, coupang 12%, coupang_rocket 35%, cafe24 3%, qoo10 10% |
| `exchange_rates` | JPY 9.5, USD 1350 |

---

## 8. 타입 정의

### 8.1 핵심 Enum/Union 타입

| 타입 | 값 |
|------|-----|
| `UserRole` | super_admin, admin, manager, member |
| `Brand` | howpapa, nucio |
| `ProjectType` | sampling, detail_page, influencer, product_order, group_purchase, other |
| `ProjectStatus` | planning, in_progress, review, completed, on_hold, cancelled |
| `Priority` | low, medium, high, urgent |
| `SeedingStatus` | listed, contacted, accepted, rejected, shipped, guide_sent, posted, completed |
| `SeedingType` | free, paid |
| `SeedingPlatform` | instagram, youtube, tiktok, blog |
| `ContentType` | story, reels, feed, both |
| `SalesChannelType` | cafe24, naver_smartstore, coupang, coupang_rocket, 29cm, ably, amazon_jp, amazon_us, allways, other |
| `AdPlatform` | naver_sa, naver_gfa, meta, coupang_ads |
| `OrderStatus` | normal, cancel, return, exchange, pending |
| `PromotionStatus` | scheduled, active, ended |
| `DevRequestStatus` | pending, in_progress, completed, on_hold |
| `DevRequestBrand` | howpapa, nucio, common |
| `ProductCategory` | 크림, 패드, 로션, 스틱, 앰플, 세럼, 미스트, 클렌저, 선크림, 마스크팩, 기타 |
| `Manufacturer` | 콜마, 코스맥스, 기타 |

### 8.2 주요 인터페이스 (99개)

#### 사용자/인증
- **User**: id, email, name, role, createdAt, avatar
- **UserRole**: super_admin (level 3) → admin (2) → manager (1) → member (0)

#### 프로젝트
- **BaseProject**: id, title, type, status, priority, startDate, targetDate, notes, attachments, history, schedules
- **SamplingProject**: brand, category, manufacturer, sampleCode, round, ratings
- **DetailPageProject**: brand, productName, workType, budget, actualCost
- **InfluencerProject**: collaborationType, platform, budget, expectedReach
- **ProductOrderProject**: brand, manufacturer, containerMaterial, quantity, unitPrice
- **GroupPurchaseProject**: brand, sellerName, revenue, contributionProfit

#### 시딩
- **SeedingProject**: name, brand, product_name, target_count, cost_price, selling_price, status
- **SeedingInfluencer**: account_id, platform, follower_count, status, shipping, performance
- **OutreachTemplate**: name, content, variables, usage_count
- **ProductGuide**: product_name, key_points, hashtags, dos, donts, public_slug

#### 매출/이커머스
- **OrderRaw**: channel, orderId, orderDate, productName, quantity, totalPrice, profit
- **SKUMaster**: skuCode, productName, brand, costPrice, sellingPrice, effectiveDate
- **SalesChannelSettings**: channel, feeRate, shippingFee
- **ProfitBreakdown**: revenue, costOfGoods, grossProfit, channelFee, adCost, netProfit
- **ProfitSettings**: vatEnabled, vatRate, variableCosts[], fixedCosts[]

#### 광고
- **AdAccount**: brandId, platform, 플랫폼별 자격증명
- **AdSpendDaily**: brandId, date, platform, spend, impressions, clicks, roas

#### 분석
- **SalesDashboardStats**: totalRevenue, totalOrders, totalAdCost, roas, profitRate
- **ChannelSummaryWithComparison**: channel, current/previous period, changes
- **BrandProfitSummary**: 매출총이익, 공헌이익, 영업이익, 순이익, ROAS, CPA

### 8.3 유틸리티 함수 (types/ecommerce.ts)

```typescript
calculateContributionProfit({ revenue, cost, shippingFee, channelFee, adCost, discount?, vat? }): number
calculateProfitBreakdown({ revenue, costOfGoods, shippingFee, channelFee, adCost, settings, orderCount, periodDays }): ProfitBreakdown
```

### 8.4 상수

- **채널 수수료율**: smartstore 5.5%, coupang 12%, coupang_rocket 35%, cafe24 3%, qoo10 10%
- **브랜드 색상**: howpapa #f97316, nucio #22c55e

---

## 9. Zustand 스토어

### 9.1 스토어 목록 (18개, 총 ~7,088 lines)

| # | 스토어 | Lines | Persist | 설명 |
|---|--------|-------|---------|------|
| 1 | `useStore.ts` | 1,003 | 부분 | 메인 앱 (인증, 프로젝트, 평가, 알림, 필터, UI) |
| 2 | `seedingStore.ts` | 1,412 | Yes | 시딩 전체 (프로젝트, 인플루언서, 템플릿, 가이드) |
| 3 | `salesDashboardStore.ts` | 607 | No | 매출 분석 (채널, 주문, 이익, 트렌드, KPI) |
| 4 | `useSalesStore.ts` | 494 | No | 매출 운영 (주문 관리, 채널 설정) |
| 5 | `useProductMasterStore.ts` | 543 | Yes | 제품 마스터 (CRUD, 검색, 필터, 카테고리) |
| 6 | `useAdAccountStore.ts` | 284 | No | 광고 계정 관리 (Meta, Naver SA/GFA, Coupang) |
| 7 | `skuMasterStore.ts` | 419 | No | SKU 마스터 (원가, 판매가, 이력) |
| 8 | `brandStore.ts` | 128 | Yes (selectedBrandId) | 멀티 브랜드 선택 |
| 9 | `channelSettingsStore.ts` | 91 | No | 채널 수수료/배송 설정 |
| 10 | `profitSettingsStore.ts` | 124 | Yes | 이익 계산 설정 (VAT, 판관비, 고정비) |
| 11 | `devRequestStore.ts` | 235 | No | 개발 요청서 CRUD |
| 12 | `useProjectFieldsStore.ts` | 414 | No | 프로젝트 커스텀 필드 |
| 13 | `useProjectSettingsStore.ts` | 312 | No | 프로젝트 워크플로우 설정 |
| 14 | `usePersonalTaskStore.ts` | 344 | No | 개인 업무/메모/상태 업데이트 |
| 15 | `useApiCredentialsStore.ts` | 243 | No | API 자격증명 (채널별 키) |
| 16 | `usePromotionStore.ts` | 167 | Yes | 프로모션 관리 |
| 17 | `useAlertSettingsStore.ts` | 129 | No | 알림 설정 (임계값, 수신자) |
| 18 | `useUserManagementStore.ts` | 139 | No | 사용자 관리 (RBAC) |

### 9.2 주요 스토어 상세

#### useStore (메인 앱)
- **인증**: login(), register(), logout(), checkAuth()
- **프로젝트**: fetchProjects(), addProject(), updateProject(), deleteProject()
- **평가**: fetchEvaluationCriteria(), addEvaluationCriteria(), reorderEvaluationCriteria()
- **알림**: addNotification(), markNotificationAsRead(), clearNotifications()
- **UI**: toggleSidebar(), toggleMobileMenu(), setCurrentView()
- **필터**: setFilters(), clearFilters(), getFilteredProjects()

#### seedingStore (시딩)
- **프로젝트**: fetchProjects(), addProject(), updateProject(), deleteProject()
- **인플루언서**: fetchInfluencers() (cursor-based pagination), addInfluencer(), addInfluencersBulk(), deleteInfluencersByProject()
- **템플릿**: fetchTemplates(), addTemplate(), updateTemplate()
- **가이드**: fetchGuides(), addGuide(), updateGuide()
- **통계**: getProjectStats() (비용 = 수량 × (인플루언서 product_price || 프로젝트 cost_price), shipped+ 상태만)
- **비용계산**: shipped, guide_sent, posted, completed 상태만 계산

#### salesDashboardStore (매출 분석)
- **KPI**: fetchDashboardStats(), calculateSummary()
- **필터**: setDateRange(), setSelectedChannel(), setSelectedBrand()
- **브랜드 동기화**: syncWithBrandStore()
- **SKU 원가 보정**: orders의 cost_price=0이면 sku_master에서 매칭
- **3단계 이익**: Gross → Operating → Net profit

#### useAdAccountStore (광고)
- **계정**: fetchAccounts(), saveAccount() (brand_id + platform unique)
- **연결테스트**: testConnection() (7일간 동기화 테스트)
- **플랫폼**: Meta, Naver SA, Naver GFA, Coupang Ads

#### brandStore (브랜드)
- **선택**: selectBrand(), selectBrandByCode()
- **헬퍼**: useSelectedBrand(), useBrandOptions()
- **Persist**: selectedBrandId 로컬스토리지 저장

#### useUserManagementStore (사용자)
- **역할 계층**: super_admin(3) > admin(2) > manager(1) > member(0)
- **보호**: super admin 이메일 (yong@howlab.co.kr) 역할 변경 불가
- **권한**: canManageUsers(), canDeleteProjects(), canEditProjects()

---

## 10. 서비스 (API 클라이언트)

### 10.1 orderSyncService.ts (249 lines)
주문 동기화 서비스 - 날짜 범위를 청크로 분할하여 동기화

| 채널 | 청크 크기 |
|------|-----------|
| smartstore | 3일 |
| cafe24 | 30일 |
| coupang | 14일 |

- `syncOrders({ channel, startDate, endDate, brandId, onProgress })` → SyncResult
- `testChannelConnection(channel, brandId)` → ConnectionTestResult
- 내부적으로 Netlify `commerce-proxy` 호출

### 10.2 salesApiService.ts (253 lines)
매출 API 인터페이스 - 채널별 서비스 구현 (cafe24, naver, coupang)

- `testConnection()` → boolean
- `fetchOrders({ startDate, endDate, page, limit })` → ApiOrderData[]
- `convertToSalesRecord(order, costPrice)` → SalesRecord

### 10.3 googleSheetsService.ts (219 lines)
Google Sheets 동기화 - Netlify Function 경유

- `extractSpreadsheetId(input)` - URL에서 스프레드시트 ID 추출
- `previewImport({ spreadsheetId, sheetName, projectId })` - 미리보기
- `importFromSheets({ ... })` - 가져오기 (삭제 후 전체 교체)
- `exportToSheets({ ... })` - 내보내기

**헤더 매핑**: Date→listed_at, Follower→follower_count, Price→product_price 등

### 10.4 adSyncService.ts (172 lines)
광고 플랫폼 동기화 - Netlify Function 경유

- `syncAdSpend(platform, brandId, startDate, endDate, callback)` → AdSyncResult
- `getAdSpendByDateRange(brandId, startDate, endDate, platform?)` → AdSpendDaily[]
- `getTotalAdSpend(brandId, startDate, endDate)` → number

---

## 11. Netlify Functions (서버리스)

### 11.1 핵심 프록시

| 함수 | 설명 | 주요 기능 |
|------|------|-----------|
| `commerce-proxy.ts` (2,409 lines) | 전 채널 통합 프록시 | 네이버/카페24/쿠팡 주문동기화, 연결테스트, 광고동기화, Cafe24 OAuth |

**Actions**: `naver_token`, `naver_api`, `cafe24-auth-url`, `cafe24-exchange-token`, `sync-orders`, `test-connection`, `ad-sync`

### 11.2 주문 동기화

| 함수 | 설명 |
|------|------|
| `naver-smartstore-sync.ts` | 스마트스토어 전용 동기화 (bcrypt 서명, 300건 배치) |
| `naver-api-test.ts` | 네이버/카페24/쿠팡 연결 테스트 |
| `scheduled-order-sync.ts` | 매시간 자동 주문 동기화 (최근 3일) |

### 11.3 Google Sheets

| 함수 | 설명 |
|------|------|
| `google-sheets-sync.ts` (644 lines) | 시딩 시트 동기화 (preview/import, 100+ 헤더 매핑) |
| `scheduled-sync.ts` | 매일 09:00 자동 시트 동기화 |
| `sheets-webhook.ts` | 시트 변경 웹훅 수신 |

### 11.4 리포트 & 알림 (스케줄)

| 함수 | 스케줄 | 설명 |
|------|--------|------|
| `daily-seeding-report.ts` | 매일 10:00 | 일일 시딩 KPI (리스트업, 수락 목표 달성률) |
| `seeding-kpi-alert.ts` | 매일 06:00, 09:00 | KPI 예외 알림 (Warning/Critical) |
| `daily-alert-check.ts` | 매일 09:00 | 매출 하락 감지, 주간 트렌드 |
| `daily-reminder.js` | 매일 10:00 | 마감일 임박/지연 프로젝트 알림 |
| `weekly-report.ts` | 매주 월 09:00 | 주간 매출/주문/시딩 요약 |
| `monthly-report.ts` | 매월 1일 01:00 | 월간 비즈니스 서머리 |
| `daily-report.js` | 매일 09:00 | 프로젝트 상태 서머리 |

### 11.5 알림 발송

| 함수 | 설명 |
|------|------|
| `send-email.js` | SMTP 이메일 (worksmobile.com) |
| `send-naver-works.js` | 네이버웍스 메시지 (RSA-SHA256 JWT) |
| `notify-assignee.js` | 담당자 배정 알림 |
| `test-report.js` | 수동 테스트 리포트 |

---

## 12. NCP 프록시 서버

### 12.1 서버 정보

| 항목 | 값 |
|------|-----|
| 플랫폼 | Naver Cloud Platform |
| OS | Ubuntu 24.04 |
| 스펙 | vCPU 1, Memory 1GB |
| 공인 IP | 49.50.131.90 |
| 포트 | 3100 |
| 프레임워크 | Express.js |
| 인증 | x-api-key / x-proxy-api-key 헤더 |
| Rate Limit | 100 req/min |

### 12.2 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/health` | 불필요 | 헬스체크 |
| POST | `/naver/token` | API Key | 네이버 Commerce 토큰 발급 (bcrypt+Base64) |
| POST | `/api/naver/test` | API Key | 네이버 연결 테스트 |
| POST | `/api/naver/sync` | API Key | 네이버 주문 동기화 (1일 단위 청크, 페이지네이션, 300건 배치) |
| ALL | `/naver/api/*` | API Key | 네이버 Commerce API 범용 프록시 |
| POST | `/cafe24/orders` | API Key | 카페24 주문 조회 (100건/페이지, 최대 10,000건) |
| POST | `/cafe24/test` | API Key | 카페24 연결 테스트 |
| POST | `/api/coupang/test` | API Key | 쿠팡 HMAC-SHA256 인증 테스트 |
| POST | `/api/coupang/sync` | API Key | 쿠팡 주문 동기화 (5개 상태, 50건/페이지) |
| POST | `/api/naver-sa/test` | API Key | 네이버 검색광고 연결 테스트 |
| POST | `/api/naver-sa/stats` | API Key | 네이버 SA 통계 조회 |
| POST | `/api/naver-gfa/*` | API Key | 네이버 GFA 프록시 |
| POST | `/proxy` | API Key | 범용 프록시 |

### 12.3 네이버 토큰 생성 (절대 변경 금지!)

```javascript
// bcrypt → Base64 순서 필수
hashedSign = bcrypt.hashSync(clientId + '_' + timestamp, clientSecret);
base64Sign = Buffer.from(hashedSign).toString('base64');
// client_secret_sign에 base64Sign 전달
```

### 12.4 서버 관리

```bash
ssh root@49.50.131.90
systemctl status naver-proxy     # 상태 확인
systemctl restart naver-proxy    # 재시작
journalctl -u naver-proxy -f     # 실시간 로그
```

---

## 13. 데이터 플로우

### 13.1 주문 동기화 플로우
```
브라우저 (React)
  → orderSyncService.ts (날짜 범위를 청크로 분할)
    → Netlify Functions (commerce-proxy.ts)
      → NCP 프록시 서버 (49.50.131.90:3100)
        → 외부 API (Naver, Cafe24, Coupang)
          → 응답 데이터 반환
        ← 주문 데이터 반환
      ← 정규화된 주문 반환
    ← orders_raw 테이블에 upsert
  ← UI 업데이트
```

### 13.2 시딩 시트 동기화 플로우
```
1. 기존 데이터 삭제 (deleteInfluencersByProject)
2. Netlify Function (google-sheets-sync.ts)로 시트 파싱
3. 프론트엔드에서 필드 매핑 + 정규화
4. DB에 새 데이터 추가 (addInfluencersBulk)
```

### 13.3 브랜드 동기화 패턴
```
brandStore.selectBrand()
  → salesDashboardStore.syncWithBrandStore()
  → useApiCredentialsStore.fetchCredentials()
  → useAdAccountStore.fetchAccounts()
  → 모든 데이터 새 브랜드 기준 재조회
```

### 13.4 3단계 이익 계산
```
1단계: 매출총이익 = 매출 - 매출원가 (- VAT)
2단계: 공헌이익 = 매출총이익 - 배송비 - 채널수수료 - 광고비 - 판관비
3단계: 순이익 = 공헌이익 - 고정비 (- 고정비 VAT)
```

### 13.5 인증 체인
```
Netlify → NCP Proxy: x-api-key 헤더
NCP Proxy → Naver Commerce: bcrypt+Base64 서명
NCP Proxy → Coupang: HMAC-SHA256 서명
NCP Proxy → Naver SA: RSA-SHA256 JWT
Cafe24: OAuth2 (access_token + refresh_token)
```

---

## 14. 환경변수

### 14.1 프론트엔드 (VITE_*)

| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 익명 키 |

### 14.2 Netlify Functions (서버사이드)

| 변수 | 설명 | 사용 함수 |
|------|------|----------|
| `SUPABASE_URL` | Supabase URL | commerce-proxy 등 10개+ |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 | commerce-proxy 등 10개+ |
| `NAVER_PROXY_URL` | NCP 프록시 URL (http://49.50.131.90:3100) | commerce-proxy |
| `NAVER_PROXY_API_KEY` | NCP 프록시 인증 키 | commerce-proxy |
| `NAVER_WORKS_CLIENT_ID` | 네이버웍스 클라이언트 ID | daily-seeding-report 등 |
| `NAVER_WORKS_CLIENT_SECRET` | 네이버웍스 시크릿 | 위와 동일 |
| `NAVER_WORKS_SERVICE_ACCOUNT` | 서비스 계정 | 위와 동일 |
| `NAVER_WORKS_BOT_ID` | 봇 ID | 위와 동일 |
| `NAVER_WORKS_CHANNEL_ID` | 채널 ID | 위와 동일 |
| `NAVER_WORKS_PRIVATE_KEY` | RSA 비공개 키 | 위와 동일 |
| `SMTP_USER` | 이메일 발송 계정 | send-email |
| `SMTP_PASS` | 이메일 비밀번호 | send-email |

### 14.3 NCP 프록시 서버 (.env)

| 변수 | 설명 |
|------|------|
| `PROXY_API_KEY` | 프록시 인증 키 |
| `PORT` | 서버 포트 (기본 3100) |

---

## 15. 오류 방지 가이드

### 15.1 Falsy 값 처리

```typescript
// ❌ 0이 '-'로 변환됨
const price = data.price || '-';

// ✅ nullish coalescing 사용
const price = data.price ?? '-';

// ⚠️ 예외: parseFloat/Number/parseInt 결과는 || 사용
const parsed = parseFloat(input) || 0;  // NaN → 0
```

### 15.2 변경 금지 코드

1. **네이버 API URL** - `product-orders` (orders로 바꾸면 404)
2. **네이버 토큰 공식** - bcrypt → Base64 순서
3. **NCP 프록시 인증** - `x-api-key` + `x-proxy-api-key` 둘 다 허용
4. **API 에러 처리** - 반드시 `handleApiError()` 사용

### 15.3 필수 체크리스트

- [ ] 수정 전: import/export 의존성 파악
- [ ] 수정 후: `npx tsc --noEmit && npm run build`
- [ ] DB 변경 시: SQL 파일 별도 작성, RLS 정책 포함
- [ ] 0/null/undefined 값 표시 확인

---

## 16. 알려진 이슈

| 이슈 | 상태 | 원인 | 대응 |
|------|------|------|------|
| Meta 토큰 만료 | 주기적 | 60일 유효기간 | 수동 재발급 |
| Cafe24 6개월 조회 제한 | 플랫폼 제한 | API 스펙 | 30일 분할 조회 |
| Naver API IP 제한 | 구조적 | 고정IP 필요 | NCP 프록시 경유 |
| Google Sheets 동기화 시 기존 삭제 | 의도된 동작 | 전체 교체 방식 | 향후 증분 동기화 예정 |

---

## 17. 변경 이력

### 2026-02-09
- `fetchInfluencers`: cursor-based pagination으로 전체 데이터 로드
- 시딩 성과 리포트 연동 문제 수정
- 광고비 미표시 수정 (NCP 프록시 → 직접 호출)
- 브랜드명 `nuccio` → `nucio` 통일

### 2026-02-초
- 매출 대시보드 UI 리디자인
- MultiBrandDashboard 컴포넌트
- 브랜드별 API 자격증명 필터링
- Cafe24 OAuth state 기반 브랜드 핸들링
- 광고 계정 관리 (Naver SA/GFA, Meta, Coupang Ads)
- 쿠팡 WING API 연동

### 2026-02-01
- NCP 서버 엔드포인트 추가 (/api/naver/test, /api/naver/sync)
- 인증 헤더 통일 (x-proxy-api-key + x-api-key 둘 다 허용)
- 전 채널 날짜 범위 청크 분할
- OrderSyncPanel 경과시간/진행바
- OrdersListPage 신규
- SalesCostInputPage orders_raw 직접 연동
- SKU 원가 반영 이익 계산

### 2026-01-31
- 매출 관리 시스템 3단계 이익 분석
- 채널별 수익성 대시보드
- Cafe24 연동 (OAuth + 주문 동기화)

---

## 보호 장치 (삭제 금지)

| 파일 | 역할 |
|------|------|
| `src/components/common/ErrorBoundary.tsx` | React Error Boundary |
| `src/lib/apiErrorHandler.ts` | API 에러 핸들러 (toast 알림) |
| `src/lib/envCheck.ts` | 환경변수 체크 |
| `src/components/common/ApiStatusMonitor.tsx` | API 연결 상태 표시 |
| `src/components/ui/toaster.tsx` | Toast 렌더링 (App.tsx 루트에 1개만) |

---

> 이 문서는 하우파파 업무시스템의 전체 구조, 데이터 스키마, 비즈니스 로직, 인프라를 포괄합니다.
