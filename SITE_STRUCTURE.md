# Howpapa & Nuccio 운영 시스템 - 전체 구조 문서

> **최종 업데이트**: 2026-01-26
> **프로젝트명**: operation_20251207
> **목적**: 하우파파(howpapa)와 누치오(nuccio) 브랜드의 운영 관리 시스템

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [디렉토리 구조](#2-디렉토리-구조)
3. [페이지 및 라우팅](#3-페이지-및-라우팅)
4. [컴포넌트 구조](#4-컴포넌트-구조)
5. [상태 관리 (Zustand)](#5-상태-관리-zustand)
6. [타입 정의](#6-타입-정의)
7. [서비스 및 API 연동](#7-서비스-및-api-연동)
8. [Netlify Functions](#8-netlify-functions)
9. [데이터베이스 스키마](#9-데이터베이스-스키마)
10. [주요 기능별 파일 매핑](#10-주요-기능별-파일-매핑)
11. [환경 설정](#11-환경-설정)
12. [개발 가이드](#12-개발-가이드)

---

## 1. 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **프레임워크** | React + TypeScript | 19 |
| **빌드 도구** | Vite | 7 |
| **스타일링** | Tailwind CSS + shadcn/ui | 3 |
| **상태 관리** | Zustand | 5 |
| **라우팅** | React Router | 7 |
| **백엔드/DB** | Supabase (PostgreSQL) | - |
| **서버리스** | Netlify Functions | - |
| **아이콘** | Lucide React | - |
| **차트** | Recharts | 3.5 |
| **캘린더** | FullCalendar | 6 |
| **이메일** | Nodemailer | - |
| **외부 연동** | Google Sheets API (googleapis) | - |

### 브랜드 테마 컬러

| 브랜드 | Primary Color | Hex Code |
|--------|---------------|----------|
| **howpapa** | `orange-500` | `#f97316` |
| **nuccio** | `green-500` | `#22c55e` |

---

## 2. 디렉토리 구조

```
operation_20251207/
│
├── src/                          # 프론트엔드 소스코드
│   ├── main.tsx                  # 앱 진입점
│   ├── App.tsx                   # 라우팅 설정
│   │
│   ├── pages/                    # 페이지 컴포넌트 (26개)
│   │   ├── DashboardPage.tsx     # 대시보드
│   │   ├── LoginPage.tsx         # 로그인
│   │   ├── RegisterPage.tsx      # 회원가입
│   │   ├── SamplingPage.tsx      # 샘플링
│   │   ├── DetailPagePage.tsx    # 상세페이지
│   │   ├── InfluencerPage.tsx    # 인플루언서
│   │   ├── ProductOrderPage.tsx  # 제품주문
│   │   ├── GroupPurchasePage.tsx # 공동구매
│   │   ├── OtherPage.tsx         # 기타
│   │   ├── DevRequestPage.tsx    # 개발요청
│   │   ├── SalesPage.tsx         # 매출관리
│   │   ├── ProductMasterPage.tsx # 제품마스터
│   │   ├── PromotionPage.tsx     # 프로모션
│   │   ├── StatisticsPage.tsx    # 통계
│   │   ├── SettingsPage.tsx      # 설정
│   │   │
│   │   ├── personal/             # 개인 기능
│   │   │   ├── PersonalNotesPage.tsx
│   │   │   ├── MyTasksPage.tsx
│   │   │   └── StatusUpdatesPage.tsx
│   │   │
│   │   └── seeding/              # 시딩 관리 (7개)
│   │       ├── SeedingProjectsPage.tsx
│   │       ├── SeedingListPage.tsx
│   │       ├── OutreachPage.tsx
│   │       ├── ShippingPage.tsx
│   │       ├── ProductGuidesPage.tsx
│   │       ├── ProductGuideEditPage.tsx
│   │       ├── ProductGuidePublicPage.tsx
│   │       └── SeedingReportsPage.tsx
│   │
│   ├── components/               # 컴포넌트 (76개)
│   │   ├── ui/                   # shadcn/ui (자동 생성, 14개)
│   │   ├── common/               # 커스텀 공통 (15개)
│   │   ├── layout/               # 레이아웃 (3개)
│   │   ├── seeding/              # 시딩 전용 (27개)
│   │   ├── products/             # 제품 관리
│   │   └── projects/             # 프로젝트 관리
│   │
│   ├── store/                    # Zustand 스토어 (11개)
│   │   ├── useStore.ts           # 메인 앱 스토어
│   │   ├── seedingStore.ts       # 시딩 관리
│   │   ├── useSalesStore.ts      # 매출 관리
│   │   ├── useProductMasterStore.ts
│   │   ├── usePromotionStore.ts
│   │   ├── useProjectSettingsStore.ts
│   │   ├── useProjectFieldsStore.ts
│   │   ├── useUserManagementStore.ts
│   │   ├── useApiCredentialsStore.ts
│   │   ├── usePersonalTaskStore.ts
│   │   └── devRequestStore.ts
│   │
│   ├── services/                 # API 서비스 (2개)
│   │   ├── googleSheetsService.ts
│   │   └── salesApiService.ts
│   │
│   ├── lib/                      # 유틸리티 (4개)
│   │   ├── utils.ts              # cn() 함수
│   │   ├── supabase.ts           # Supabase 클라이언트
│   │   ├── sendEmail.ts
│   │   └── sendNaverWorks.ts
│   │
│   ├── utils/                    # 헬퍼 함수
│   │   └── helpers.ts            # 포맷팅, 상태 라벨 등
│   │
│   ├── types/                    # 타입 정의 (2개)
│   │   ├── index.ts              # 메인 타입 (1,176줄)
│   │   └── database.ts           # Supabase 타입
│   │
│   ├── hooks/                    # 커스텀 훅
│   │   └── use-toast.ts
│   │
│   └── assets/                   # 정적 자산
│
├── netlify/
│   └── functions/                # 서버리스 함수 (9개)
│       ├── google-sheets-sync.ts
│       ├── scheduled-sheets-sync.ts
│       ├── scheduled-sync.ts
│       ├── daily-report.js
│       ├── daily-reminder.js
│       ├── test-report.js
│       ├── notify-assignee.js
│       ├── send-email.js
│       └── send-naver-works.js
│
├── supabase/
│   └── functions/                # Supabase Edge Functions (2개)
│
├── *.sql                         # DB 스키마 파일 (8개)
│   ├── supabase-all-schema.sql
│   ├── supabase-schema.sql
│   ├── supabase-sales-schema.sql
│   ├── supabase-api-credentials-schema.sql
│   ├── supabase-project-fields-schema.sql
│   ├── supabase-project-settings-schema.sql
│   ├── supabase-personal-tasks-schema.sql
│   └── supabase-profiles-fix.sql
│
└── 설정 파일
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── netlify.toml
    ├── components.json           # shadcn/ui 설정
    └── .env.example
```

---

## 3. 페이지 및 라우팅

### 인증 라우트 (Public)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/login` | LoginPage | 로그인 |
| `/register` | RegisterPage | 회원가입 |
| `/g/:slug` | ProductGuidePublicPage | 제품 가이드 공개 링크 |

### 메인 라우트 (Protected - 로그인 필요)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | DashboardPage | 대시보드 (메인) |
| `/sampling` | SamplingPage | 샘플링 프로젝트 |
| `/detail-page` | DetailPagePage | 상세페이지 프로젝트 |
| `/influencer` | InfluencerPage | 인플루언서 프로젝트 |
| `/product-order` | ProductOrderPage | 제품주문 프로젝트 |
| `/group-purchase` | GroupPurchasePage | 공동구매 프로젝트 |
| `/other` | OtherPage | 기타 프로젝트 |

### 관리 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/dev-requests` | DevRequestPage | 개발요청 관리 |
| `/sales` | SalesPage | 매출 관리 |
| `/product-master` | ProductMasterPage | 제품 마스터 |
| `/promotion` | PromotionPage | 프로모션 관리 |
| `/statistics` | StatisticsPage | 통계 |
| `/settings` | SettingsPage | 설정 |

### 개인 기능 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/personal/notes` | PersonalNotesPage | 개인 메모 |
| `/personal/my-tasks` | MyTasksPage | 내 할일 |
| `/personal/status-updates` | StatusUpdatesPage | 상태 업데이트 |

### 시딩(인플루언서 마케팅) 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/seeding` | SeedingProjectsPage | 시딩 프로젝트 목록 |
| `/seeding/list` | SeedingListPage | 인플루언서 리스트 (전체) |
| `/seeding/list/:projectId` | SeedingListPage | 프로젝트별 인플루언서 |
| `/seeding/outreach` | OutreachPage | 연락 템플릿 관리 |
| `/seeding/shipping` | ShippingPage | 배송 관리 |
| `/seeding/guides` | ProductGuidesPage | 제품 가이드 목록 |
| `/seeding/guides/new` | ProductGuideEditPage | 가이드 생성 |
| `/seeding/guides/:id/edit` | ProductGuideEditPage | 가이드 수정 |
| `/seeding/reports` | SeedingReportsPage | 시딩 리포트 |

---

## 4. 컴포넌트 구조

### 4.1 shadcn/ui 컴포넌트 (`src/components/ui/`)

> 자동 생성된 기본 UI 컴포넌트 - 직접 수정 가능

| 컴포넌트 | 용도 |
|----------|------|
| `badge.tsx` | 배지/태그 |
| `button.tsx` | 버튼 |
| `card.tsx` | 카드 레이아웃 |
| `dialog.tsx` | 모달 다이얼로그 |
| `dropdown-menu.tsx` | 드롭다운 메뉴 |
| `input.tsx` | 입력 필드 |
| `label.tsx` | 라벨 |
| `select.tsx` | 셀렉트박스 |
| `sheet.tsx` | 슬라이드 패널 |
| `table.tsx` | 테이블 |
| `tabs.tsx` | 탭 |
| `textarea.tsx` | 텍스트영역 |
| `toast.tsx` | 토스트 알림 |
| `toaster.tsx` | 토스트 컨테이너 |

### 4.2 공통 컴포넌트 (`src/components/common/`)

| 컴포넌트 | 용도 | 주요 Props |
|----------|------|-----------|
| `Badge.tsx` | 커스텀 배지 | `color`, `children` |
| `Card.tsx` | 카드 래퍼 | `title`, `children` |
| `ConfirmModal.tsx` | 확인 다이얼로그 | `isOpen`, `onConfirm`, `onCancel` |
| `CopyButton.tsx` | 클립보드 복사 | `text` |
| `EmptyState.tsx` | 빈 상태 표시 | `icon`, `title`, `description` |
| `FilterBar.tsx` | 필터 바 | `filters`, `onChange` |
| `ImageUploader.tsx` | 이미지 업로드 | `onUpload`, `maxFiles` |
| `Modal.tsx` | 범용 모달 | `isOpen`, `onClose`, `title` |
| `SlidePanel.tsx` | 사이드 패널 | `isOpen`, `onClose`, `width` |
| `StatsCard.tsx` | 통계 카드 | `title`, `value`, `icon` |
| `StatusTabs.tsx` | 상태별 탭 | `statuses`, `current`, `onChange` |
| `TagInput.tsx` | 태그 입력 | `tags`, `onAdd`, `onRemove` |
| `UpcomingSchedules.tsx` | 일정 표시 | `schedules` |
| `UserSelect.tsx` | 사용자 선택 | `value`, `onChange` |

### 4.3 레이아웃 컴포넌트 (`src/components/layout/`)

| 컴포넌트 | 용도 |
|----------|------|
| `Layout.tsx` | 메인 레이아웃 (사이드바 + 헤더 포함) |
| `Header.tsx` | 상단 헤더 (검색, 알림, 사용자 메뉴) |
| `Sidebar.tsx` | 좌측 네비게이션 |

### 4.4 시딩 컴포넌트 (`src/components/seeding/`)

**핵심 리스트/관리:**
| 컴포넌트 | 용도 |
|----------|------|
| `SeedingListHeader.tsx` | 리스트 헤더 (검색, 필터) |
| `SeedingStatusTabs.tsx` | 상태별 탭 필터 |
| `SeedingTable.tsx` | 인플루언서 테이블 |
| `SeedingTableRow.tsx` | 테이블 행 |
| `SeedingDetailPanel.tsx` | 인플루언서 상세 패널 |
| `SeedingProjectCard.tsx` | 프로젝트 카드 |

**모달 & 폼:**
| 컴포넌트 | 용도 |
|----------|------|
| `SeedingAddModal.tsx` | 인플루언서 추가 모달 |
| `SeedingProjectModal.tsx` | 프로젝트 생성/수정 모달 |
| `InfluencerSelectModal.tsx` | 인플루언서 선택 모달 |
| `BulkTrackingModal.tsx` | 일괄 운송장 입력 |

**기능:**
| 컴포넌트 | 용도 |
|----------|------|
| `GoogleSheetsSync.tsx` | 구글 시트 동기화 UI |
| `OutreachTemplateModal.tsx` | 연락 템플릿 모달 |
| `OutreachTemplateCard.tsx` | 템플릿 카드 |
| `ProductSelector.tsx` | 제품 선택기 |
| `ProductGuideCard.tsx` | 제품 가이드 카드 |
| `PerformanceInputForm.tsx` | 성과 입력 폼 |
| `ShippingTable.tsx` | 배송 테이블 |
| `ShippingTableRow.tsx` | 배송 행 |

**리포트 (`src/components/seeding/report/`):**
| 컴포넌트 | 용도 |
|----------|------|
| `ReportSummaryCards.tsx` | 요약 카드 |
| `ReportCostCards.tsx` | 비용 카드 |
| `ProductSeedingTable.tsx` | 제품별 시딩 테이블 |
| `DailyPostingChart.tsx` | 일별 포스팅 차트 |
| `ContentTypeChart.tsx` | 콘텐츠 유형 차트 |
| `SeedingTypeChart.tsx` | 시딩 유형 차트 |
| `TopInfluencersTable.tsx` | 상위 인플루언서 테이블 |
| `ReportFilters.tsx` | 리포트 필터 |

---

## 5. 상태 관리 (Zustand)

### 5.1 메인 스토어 (`src/store/useStore.ts`)

**역할**: 앱 전반적인 상태 관리

```typescript
// 주요 상태
interface AppState {
  // 인증
  user: User | null;
  isAuthenticated: boolean;

  // 프로젝트
  projects: Project[];
  selectedProject: Project | null;

  // UI 상태
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  currentView: 'board' | 'list' | 'calendar';

  // 필터/정렬
  filters: FilterState;
  sortBy: SortOption;
}

// 주요 액션
- login(email, password)
- logout()
- register(email, password, name, role)
- fetchProjects()
- addProject(project)
- updateProject(id, data)
- deleteProject(id)
- setFilter(filter)
```

### 5.2 시딩 스토어 (`src/store/seedingStore.ts`)

**역할**: 인플루언서 시딩 관리

```typescript
// 주요 상태
interface SeedingState {
  projects: SeedingProject[];
  influencers: SeedingInfluencer[];
  outreachTemplates: OutreachTemplate[];
  productGuides: ProductGuide[];
  filters: SeedingFilters;
}

// 주요 액션
- fetchProjects()
- addProject(project)
- fetchInfluencers(projectId?)
- addInfluencer(data)
- addInfluencersBulk(data[])      // 일괄 추가
- deleteInfluencersBulk(ids[])    // 일괄 삭제
- updateInfluencer(id, data)
- updateInfluencerStatus(id, status)
- getProjectStats(projectId)      // 통계 계산
- getOverallStats()               // 전체 통계
```

### 5.3 매출 스토어 (`src/store/useSalesStore.ts`)

**역할**: 매출 및 제품 관리

```typescript
// 주요 기능
- 제품 관리 (CRUD)
- 매출 기록
- 일별/월별 집계
- 채널별 분석 (Cafe24, Naver, Coupang)
```

### 5.4 기타 스토어

| 스토어 | 역할 |
|--------|------|
| `useProductMasterStore.ts` | 제품 마스터 데이터, 인증, 임상시험 |
| `usePromotionStore.ts` | 프로모션 관리 |
| `useProjectSettingsStore.ts` | 프로젝트 타입 설정, 알림 설정 |
| `useProjectFieldsStore.ts` | 동적 필드 설정 |
| `useUserManagementStore.ts` | 사용자 관리 |
| `useApiCredentialsStore.ts` | API 연동 설정 (Cafe24, Naver, Coupang) |
| `usePersonalTaskStore.ts` | 개인 할일 |
| `devRequestStore.ts` | 개발요청 관리 |

---

## 6. 타입 정의

### 6.1 사용자 및 역할 (`src/types/index.ts`)

```typescript
type UserRole = 'super_admin' | 'admin' | 'manager' | 'member';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}
```

### 6.2 브랜드 및 제품

```typescript
type Brand = 'howpapa' | 'nuccio';

type ProductCategory =
  | 'shampoo' | 'treatment' | 'essence'
  | 'mist' | 'tonic' | 'powder'
  | 'set' | 'sample' | 'etc'
  | 'cleanser' | 'cream';

type Manufacturer = 'Colmar' | 'Cosmax' | 'Other';
```

### 6.3 프로젝트

```typescript
type ProjectStatus =
  | 'planning' | 'in_progress' | 'review'
  | 'completed' | 'on_hold' | 'cancelled';

type ProjectType =
  | 'sampling' | 'detail_page' | 'influencer'
  | 'product_order' | 'group_purchase' | 'other';

interface Project {
  id: string;
  title: string;
  brand: Brand;
  type: ProjectType;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  requester_id: string;
  assignee_id: string;
  // ... 타입별 추가 필드
}
```

### 6.4 시딩 관련

```typescript
type SeedingStatus =
  | 'listed'      // 리스트업
  | 'contacted'   // 연락완료
  | 'accepted'    // 수락
  | 'rejected'    // 거절
  | 'shipped'     // 제품발송
  | 'guide_sent'  // 가이드발송
  | 'posted'      // 포스팅완료
  | 'completed';  // 완료

type SeedingType = 'free' | 'paid';
type ContentType = 'story' | 'reels' | 'feed' | 'both';
type SeedingPlatform = 'instagram' | 'youtube' | 'tiktok' | 'blog';

interface SeedingProject {
  id: string;
  brand: Brand;
  name: string;
  platform: SeedingPlatform;
  product_name: string;
  cost_price: number;
  start_date: string;
  end_date: string;
  google_sheet_url?: string;
  auto_sync_enabled: boolean;
}

interface SeedingInfluencer {
  id: string;
  project_id: string;
  account_id: string;
  platform: SeedingPlatform;
  email?: string;
  profile_url?: string;
  follower_count?: number;
  status: SeedingStatus;
  seeding_type: SeedingType;
  content_type?: ContentType;
  product_name?: string;
  product_price?: number;
  quantity: number;
  tracking_number?: string;
  // 성과 데이터
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  posted_at?: string;
  content_url?: string;
}
```

### 6.5 개발요청

```typescript
type DevRequestBrand = 'howpapa' | 'nuccio' | 'common';
type DevRequestType = 'feature' | 'ui' | 'bug' | 'other';
type DevRequestPriority = 'urgent' | 'high' | 'normal' | 'low';
type DevRequestStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';

interface DevRequest {
  id: string;
  title: string;
  description: string;
  brand: DevRequestBrand;
  type: DevRequestType;
  priority: DevRequestPriority;
  status: DevRequestStatus;
  requester_id: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 7. 서비스 및 API 연동

### 7.1 Google Sheets 연동 (`src/services/googleSheetsService.ts`)

**용도**: 인플루언서 리스트 일괄 가져오기/내보내기

```typescript
// 주요 함수
extractSpreadsheetId(url: string)     // 시트 URL에서 ID 추출
previewImport(sheetUrl, projectId)    // 가져오기 미리보기
importInfluencers(sheetUrl, projectId) // 일괄 가져오기
exportInfluencers(sheetUrl, data)     // 내보내기

// 시트 컬럼 → DB 필드 매핑
Date → listed_at
Follower → follower_count
E-mail → email
URL(youtube, instagram) → profile_url
DM sent → status 판별
Response received → status 판별
acceptance → status 판별
Product → product_name (가격 파싱)
Product Shipment → status=shipped
NOTE → notes
Cost → product_price
```

### 7.2 매출 API 연동 (`src/services/salesApiService.ts`)

**용도**: 판매 채널 연동

- Cafe24 주문 동기화
- 네이버 스마트스토어 연동
- 쿠팡 연동

### 7.3 Supabase 클라이언트 (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    }
  }
);
```

---

## 8. Netlify Functions

> 서버리스 백엔드 함수 (경로: `netlify/functions/`)

| 함수 | 용도 | 트리거 |
|------|------|--------|
| `google-sheets-sync.ts` | 구글 시트 가져오기/내보내기 | HTTP 요청 |
| `scheduled-sheets-sync.ts` | 자동 시트 동기화 | 스케줄 |
| `scheduled-sync.ts` | 일반 스케줄 동기화 | 스케줄 |
| `daily-report.js` | 일일 리포트 생성 | 스케줄 |
| `daily-reminder.js` | D-day 알림 발송 | 스케줄 |
| `test-report.js` | 테스트 리포트 | HTTP 요청 |
| `notify-assignee.js` | 담당자 알림 | HTTP 요청 |
| `send-email.js` | 이메일 발송 | HTTP 요청 |
| `send-naver-works.js` | 네이버웍스 메시지 | HTTP 요청 |

---

## 9. 데이터베이스 스키마

### 9.1 주요 테이블

| 테이블 | 용도 |
|--------|------|
| `profiles` | 사용자 프로필 (역할, 아바타) |
| `projects` | 메인 프로젝트 |
| `evaluation_criteria` | 샘플 평가 기준 |
| `products` | 제품 카탈로그 |
| `sales_records` | 매출 기록 |
| `api_credentials` | 외부 API 인증정보 |
| `api_sync_logs` | 동기화 로그 |
| `project_type_settings` | 프로젝트 타입 설정 |
| `notification_settings` | 알림 설정 |
| `project_field_settings` | 동적 필드 설정 |
| `seeding_projects` | 시딩 프로젝트 |
| `seeding_influencers` | 인플루언서 목록 |
| `outreach_templates` | 연락 템플릿 |
| `product_guides` | 제품 가이드 |

### 9.2 스키마 파일

| 파일 | 내용 |
|------|------|
| `supabase-all-schema.sql` | 전체 스키마 |
| `supabase-schema.sql` | 핵심 스키마 |
| `supabase-sales-schema.sql` | 매출 관련 |
| `supabase-api-credentials-schema.sql` | API 인증 |
| `supabase-project-fields-schema.sql` | 필드 설정 |
| `supabase-project-settings-schema.sql` | 프로젝트 설정 |
| `supabase-personal-tasks-schema.sql` | 개인 할일 |
| `supabase-profiles-fix.sql` | 프로필 수정 |

---

## 10. 주요 기능별 파일 매핑

### 10.1 시딩(인플루언서 마케팅)

```
기능: 인플루언서 리스트 관리, 구글 시트 연동, 배송, 가이드, 리포트

관련 파일:
├── pages/seeding/*.tsx           # 페이지 (7개)
├── components/seeding/*.tsx      # 컴포넌트 (27개)
├── store/seedingStore.ts         # 스토어
├── services/googleSheetsService.ts
├── netlify/functions/google-sheets-sync.ts
└── types/index.ts (SeedingProject, SeedingInfluencer 등)
```

### 10.2 프로젝트 관리

```
기능: 샘플링, 상세페이지, 인플루언서, 제품주문, 공동구매, 기타

관련 파일:
├── pages/SamplingPage.tsx 등     # 타입별 페이지
├── components/projects/          # 프로젝트 컴포넌트
├── store/useStore.ts             # 메인 스토어
├── store/useProjectSettingsStore.ts
├── store/useProjectFieldsStore.ts
└── types/index.ts (Project, ProjectType 등)
```

### 10.3 매출 관리

```
기능: 제품별 매출, 채널 연동, 리포트

관련 파일:
├── pages/SalesPage.tsx
├── store/useSalesStore.ts
├── services/salesApiService.ts
├── store/useApiCredentialsStore.ts
└── supabase-sales-schema.sql
```

### 10.4 개발요청

```
기능: 개발 요청 접수 및 관리

관련 파일:
├── pages/DevRequestPage.tsx
├── store/devRequestStore.ts
└── types/index.ts (DevRequest)
```

---

## 11. 환경 설정

### 11.1 환경 변수 (`.env`)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Sheets (Netlify Function용)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# Email (Netlify Function용)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Naver Works (선택)
NAVER_WORKS_BOT_ID=xxx
NAVER_WORKS_CLIENT_ID=xxx
NAVER_WORKS_CLIENT_SECRET=xxx
```

### 11.2 주요 설정 파일

**vite.config.ts:**
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**tailwind.config.js:**
- 브랜드 컬러 (orange, green)
- 커스텀 컬러 (primary, secondary 등)
- 폰트: Pretendard, Inter
- 다크모드 지원

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 12. 개발 가이드

### 12.1 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint
```

### 12.2 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]

# 예시
npx shadcn@latest add alert
npx shadcn@latest add calendar
```

### 12.3 Import 규칙

```typescript
// 경로 별칭 사용
import { Button } from "@/components/ui/button";
import { useSeedingStore } from "@/store/seedingStore";
import { SeedingInfluencer } from "@/types";

// cn 유틸리티로 클래스 병합
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class"
)}>
```

### 12.4 DB 스키마 변경 시

1. `supabase/migrations/`에 SQL 파일 추가
2. Supabase SQL Editor에서 실행
3. 관련 스토어 함수 수정
4. `src/types/index.ts` 타입 업데이트

### 12.5 주의사항

1. **타입 안전성**: `any` 타입 사용 금지
2. **에러 처리**: try-catch로 API 호출 감싸기
3. **상태 관리**: 전역=Zustand, 로컬=useState
4. **shadcn/ui 우선**: 새 UI 작성 전 기존 컴포넌트 확인

---

## 부록: 코드 통계

| 항목 | 수량 |
|------|------|
| TypeScript 코드 | ~16,500줄 |
| 페이지 | 26개 |
| 컴포넌트 | 76개 |
| Zustand 스토어 | 11개 |
| Netlify Functions | 9개 |
| DB 테이블 | 14개 |
| 지원 브랜드 | 2개 (howpapa, nuccio) |
| 프로젝트 타입 | 6개 |
| 시딩 상태 | 8개 |

---

> 이 문서는 새 개발자와 유지보수 업체가 프로젝트를 빠르게 이해하기 위해 작성되었습니다.
> 문의사항이 있으면 기존 코드와 CLAUDE.md를 참고하세요.
