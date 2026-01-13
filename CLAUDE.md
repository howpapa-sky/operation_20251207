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
