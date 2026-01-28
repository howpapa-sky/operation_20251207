# Google Sheets 실시간 연동 설정 가이드

## 개요
시트 수정 시 **1-2초 내에** DB에 자동 반영됩니다.

```
[Google Sheets 수정] → [Apps Script 감지] → [Webhook 호출] → [DB 업데이트]
```

## 설정 방법 (5분 소요)

### 1단계: Netlify 환경변수 설정 (선택)

보안을 위해 시크릿 키를 설정하려면:

```
SHEETS_WEBHOOK_SECRET=your-secret-key-here
```

### 2단계: Google Sheets에 Apps Script 설치

1. **Google Sheets 열기**
   - 연동할 스프레드시트를 엽니다

2. **Apps Script 열기**
   - 메뉴: `확장 프로그램` → `Apps Script`

3. **코드 붙여넣기**
   - 기존 코드를 모두 삭제
   - `docs/google-apps-script.js` 내용 전체 복사 → 붙여넣기

4. **Webhook URL 수정**
   ```javascript
   const WEBHOOK_URL = 'https://YOUR_SITE.netlify.app/.netlify/functions/sheets-webhook';
   ```
   - `YOUR_SITE`를 실제 Netlify 사이트명으로 변경

5. **시크릿 키 설정** (선택)
   ```javascript
   const WEBHOOK_SECRET = 'your-secret-key-here';
   ```
   - Netlify 환경변수와 동일하게 설정

6. **저장**
   - `Ctrl+S` 또는 💾 아이콘 클릭

7. **트리거 설치**
   - 함수 선택 드롭다운에서 `setupTriggers` 선택
   - ▶️ 실행 버튼 클릭
   - Google 권한 승인 (처음 1회만)

### 3단계: 연동 확인

1. 시트에서 아무 셀이나 수정
2. 앱에서 데이터가 바로 반영되는지 확인
3. 시트 메뉴: `🔄 실시간 연동` → `ℹ️ 연동 상태 확인`

## 사용법

### 자동 동기화
- 셀 수정 → 자동 반영 (1-2초)
- 행 추가/삭제 → 5초 후 전체 동기화

### 수동 동기화
- 시트 메뉴: `🔄 실시간 연동` → `🔄 전체 동기화`

### 연동 비활성화
- 시트 메뉴: `🔄 실시간 연동` → `🔌 실시간 연동 비활성화`

## 지원하는 시트 헤더

| 시트 헤더 | DB 필드 |
|-----------|---------|
| Date, 날짜, 등록일 | listed_at |
| Follower, 팔로워 | follower_count |
| Following, 팔로잉 | following_count |
| E-mail, 이메일 | email |
| URL, URL(youtube, instagram) | profile_url |
| Product, 제품명 | product_name |
| Price, 가격, 단가 | product_price |
| NOTE, 메모 | notes |
| shipped date, 발송일 | shipped_at |
| upload date, 업로드예정 | posted_at |
| completed, 완료일 | completed_at |
| acceptance date, 수락일 | accepted_at |

## 문제 해결

### "Webhook failed" 로그가 보일 때
1. Webhook URL이 올바른지 확인
2. Netlify 함수가 배포되었는지 확인
3. 시크릿 키가 일치하는지 확인

### 동기화가 안될 때
1. Apps Script에서 `실행 기록` 확인
2. 시트 메뉴에서 `연동 상태 확인` 실행
3. 트리거가 활성화되어 있는지 확인

### 권한 오류
1. Apps Script 재실행
2. Google 계정 권한 다시 승인

## 주의사항

- **프로젝트 연결 필수**: 시트 URL이 프로젝트의 `listup_sheet_url`에 저장되어 있어야 합니다
- **헤더 행 유지**: 1행은 반드시 헤더로 사용
- **account_id 필수**: URL 컬럼에서 계정 ID를 추출할 수 있어야 함
