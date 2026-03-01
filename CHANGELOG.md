# Changelog

모든 주요 변경사항을 이 문서에 기록합니다.

---

## [2026-03-01] 오류 방지 체계 구축

### 추가
- **ErrorBoundary 컴포넌트**: 각 주요 페이지에 React Error Boundary 적용, 에러 발생 시 사용자에게 새로고침 버튼과 에러 메시지 표시 (`src/components/common/ErrorBoundary.tsx`)
- **API 에러 핸들러**: 모든 API 호출에 일관된 에러 처리 + toast 알림 유틸리티 (`src/lib/apiErrorHandler.ts`)
- **환경변수 검증**: 앱 시작 시 필수 환경변수 체크, 누락 시 콘솔 경고 (`src/lib/envCheck.ts`)
- **API 상태 모니터링 UI**: 설정 페이지에 채널별 연결 상태 표시 + 테스트 버튼 (`src/components/common/ApiStatusMonitor.tsx`)
- **Toast 알림 통합**: Layout에 Toaster 컴포넌트 렌더링, 에러/성공 알림 표시
- **빌드 검증 스크립트**: `npm run pre-deploy` (lint + build), `npm run deploy` (pre-deploy + push)
- **ERROR_PREVENTION_GUIDE.md**: 코드 변경 시 체크리스트 문서화
- **CHANGELOG.md**: 변경 이력 관리 문서

### 수정
- **Falsy 값 전수 점검**: 전체 프로젝트에서 숫자 필드의 `||` → `??` 교체 (87개소)
  - 금액(0원), 수량(0개), 팔로워 수(0명) 등에서 0이 정상 표시되도록 수정
  - `parseFloat()`, `Number()`, `parseInt()` 결과에는 `||` 유지 (NaN 처리 필요)
  - **영향 범위**: store 파일 8개, 페이지 10개, 컴포넌트 12개

### 영향 범위
- `src/components/layout/Layout.tsx` - Toaster + ErrorBoundary 추가
- `src/main.tsx` - 환경변수 검증 호출 추가
- `src/pages/SettingsPage.tsx` - API 상태 모니터 컴포넌트 추가
- `package.json` - pre-deploy, deploy 스크립트 추가
- 전체 store/page/component - falsy 값 처리 개선

---

## [2026-02-09] 시딩 성과 리포트 + 광고비 연동 수정

### 수정
- `fetchInfluencers`: cursor-based pagination으로 전체 데이터 로드
- 시딩 성과 리포트 연동 문제 수정
- 광고비 미표시 근본 원인 수정 (NCP 프록시 → 직접 호출 전환)
- 브랜드명 `nuccio` → `nucio` 전체 코드베이스 + DB 통일

---

## [2026-02-초] 매출 대시보드 대폭 개선 + 멀티 브랜드

### 추가
- 매출 대시보드 UI 리디자인 (채널 성과, 트렌드 차트, 비교 테이블)
- MultiBrandDashboard 컴포넌트 (채널별 매출, 광고비 통합 뷰)
- 브랜드별 API 자격증명 필터링
- Cafe24 OAuth: state 기반 브랜드 핸들링
- 광고 계정 관리 (Naver SA/GFA, Meta, Coupang Ads)
- 쿠팡 WING API 연동

---

## [2026-02-01] 스마트스토어 주문 수집 + 동기화 UX 개선

### 추가
- NCP 서버에 `/api/naver/test`, `/api/naver/sync` 엔드포인트
- OrderSyncPanel 경과시간 표시, 진행바
- 전 채널 날짜 범위 청크 분할 (14일/30일)

### 수정
- 인증 헤더 `x-proxy-api-key` → `x-api-key` 통일 + 둘 다 허용
- 504 타임아웃 해결

---

## [2026-02-01] 주문서 전체목록 + 원가 입력

### 추가
- OrdersListPage: 주문서 전체목록 페이지
- SalesCostInputPage: orders_raw 테이블 직접 연동
- salesDashboardStore: SKU 원가 반영한 이익 계산

---

## [2026-01-31] 매출 관리 시스템 3단계 이익 분석

### 추가
- 매출총이익, 영업이익, 순이익 3단계 분석
- 채널별 수익성 대시보드
- Cafe24 연동 (OAuth + 주문 동기화)
