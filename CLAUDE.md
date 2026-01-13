# Howpapa & Nuccio Operation System

## 프로젝트 개요
하우파파(howpapa)와 누치오(nuccio) 브랜드의 운영 관리 시스템

## 기술 스택
- **프론트엔드**: React 19 + TypeScript + Vite
- **스타일링**: Tailwind CSS
- **상태관리**: Zustand
- **백엔드**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Netlify (Functions 포함)
- **아이콘**: Lucide React
- **UI 컴포넌트**: Headless UI

## 브랜드 테마
| 브랜드 | Primary Color | 사용처 |
|--------|---------------|--------|
| howpapa | `orange-500` / `#f97316` | 메인 브랜드 |
| nuccio | `green-500` / `#22c55e` | 서브 브랜드 |

## 디렉토리 구조
```
src/
├── components/       # 재사용 가능한 컴포넌트
│   ├── common/       # 공통 UI 컴포넌트 (Button, Modal, Card 등)
│   └── layout/       # 레이아웃 컴포넌트
├── pages/            # 페이지 컴포넌트
├── store/            # Zustand 스토어
├── lib/              # 유틸리티 함수
├── types/            # TypeScript 타입 정의
└── hooks/            # 커스텀 훅
```

## 코딩 컨벤션

### 네이밍
- **컴포넌트**: PascalCase (`ProjectCard.tsx`)
- **함수/변수**: camelCase (`fetchProjects`, `isLoading`)
- **상수**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **타입/인터페이스**: PascalCase (`interface Project`)

### 파일 구조
- 컴포넌트 파일은 해당 기능 폴더에 위치
- 페이지별 컴포넌트는 `pages/[feature]/` 하위에

### Tailwind CSS 규칙
- 공통 스타일은 `@apply`로 클래스화
- 브랜드 색상은 항상 테마 변수 사용
- 반응형: `sm:`, `md:`, `lg:` 순서로 작성

## 컴포넌트 작성 규칙

### 공통 컴포넌트 사용 (src/components/common/)
기존 공통 컴포넌트를 우선 사용:
- `SlidePanel` - 사이드 패널
- `StatusTabs` - 상태 탭
- `StatsCard` - 통계 카드
- `DataTable` - 데이터 테이블
- `EmptyState` - 빈 상태 표시
- `LoadingSpinner` - 로딩 스피너

### 새 컴포넌트 작성 시
1. 기존 공통 컴포넌트로 구현 가능한지 먼저 확인
2. Props는 TypeScript interface로 명시
3. 기본값은 defaultProps 또는 구조분해 기본값 사용

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}: ButtonProps) {
  // ...
}
```

## Supabase 규칙
- 테이블명: snake_case (`seeding_projects`)
- 컬럼명: snake_case (`created_at`, `user_id`)
- RLS 정책 필수 적용
- 타입은 `src/types/database.ts`에 정의

## 자주 사용하는 명령어
```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

## 주의사항
1. **타입 안전성**: `any` 타입 사용 최소화, 명시적 타입 정의
2. **에러 처리**: try-catch로 API 호출 감싸기
3. **상태 관리**: 전역 상태는 Zustand, 로컬 상태는 useState
4. **불변성**: 상태 업데이트 시 spread 연산자 사용
