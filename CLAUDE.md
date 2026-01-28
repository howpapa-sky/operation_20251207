# Howpapa & Nuccio Operation System

## 프로젝트 개요
하우파파(howpapa)와 누치오(nuccio) 브랜드의 운영 관리 시스템

## 기술 스택
- **프론트엔드**: React 19 + TypeScript + Vite
- **스타일링**: Tailwind CSS + shadcn/ui
- **상태관리**: Zustand
- **백엔드**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Netlify (Functions 포함)
- **아이콘**: Lucide React

## 브랜드 테마
| 브랜드 | Primary Color | 사용처 |
|--------|---------------|--------|
| howpapa | `orange-500` / `#f97316` | 메인 브랜드 |
| nuccio | `green-500` / `#22c55e` | 서브 브랜드 |

## 디렉토리 구조
```
src/
├── components/
│   ├── ui/           # shadcn/ui 컴포넌트 (자동 생성)
│   ├── common/       # 커스텀 공통 컴포넌트
│   └── layout/       # 레이아웃 컴포넌트
├── pages/            # 페이지 컴포넌트
├── store/            # Zustand 스토어
├── lib/              # 유틸리티 함수 (cn 함수 포함)
├── types/            # TypeScript 타입 정의
└── hooks/            # 커스텀 훅
```

## Import Alias
`@/` = `src/` (예: `import { Button } from "@/components/ui/button"`)

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

---

## Supabase 규칙
- 테이블명: snake_case (`seeding_projects`)
- 컬럼명: snake_case (`created_at`, `user_id`)
- RLS 정책 필수 적용
- 타입은 `src/types/database.ts`에 정의

---

## 자주 사용하는 명령어
```bash
npm run dev                        # 개발 서버 실행
npm run build                      # 프로덕션 빌드
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

---

## 인플루언서 시딩 기능

### 주요 파일
| 파일 | 설명 |
|------|------|
| `src/store/seedingStore.ts` | Zustand 스토어 (CRUD, 통계 계산) |
| `src/types/index.ts` | SeedingInfluencer, SeedingProject 타입 |
| `netlify/functions/google-sheets-sync.ts` | Google Sheets 연동 Netlify Function |
| `src/services/googleSheetsService.ts` | Sheets API 클라이언트 |
| `src/components/seeding/GoogleSheetsSync.tsx` | Sheets 동기화 UI |

### Google Sheets 컬럼 매핑
시트 가져오기 시 헤더명 → DB 필드 매핑:

```
Date → listed_at
Follower → follower_count
E-mail → email
URL(youtube, instagram) → profile_url (account_id 자동 추출)
DM sent (Yes/No) → status 판별용
Response received (Yes/No) → status 판별용
acceptance (Yes/No) → status 판별용
Product → product_name (가격 파싱: "제품명 (15,000원)" → product_name + product_price)
Product Shipment (Yes/No) → status=shipped
NOTE → notes
Cost → product_price
```

### 컬럼 매핑 추가 방법
`netlify/functions/google-sheets-sync.ts`의 `columnMapping` 객체에 추가:
```ts
const columnMapping: Record<string, string> = {
  '새컬럼명': 'db_field_name',
  'New Column': 'db_field_name',
  // ...
};
```

### 비용 계산 로직
- **발송완료 상태만 계산**: `shipped`, `guide_sent`, `posted`, `completed`
- 계산식: `수량 × (인플루언서별 product_price || 프로젝트 cost_price)`
- 위치: `seedingStore.ts` → `getProjectStats()`, `getOverallStats()`

### 시트 가져오기 플로우
1. 기존 데이터 삭제 (deleteInfluencersBulk)
2. Netlify Function으로 시트 데이터 파싱
3. DB에 새 데이터 추가 (addInfluencersBulk)

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

