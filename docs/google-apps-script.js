/**
 * ========================================
 * Google Sheets 실시간 연동 스크립트
 * ========================================
 *
 * 이 스크립트를 Google Sheets에 설치하면
 * 시트 수정 시 자동으로 DB에 반영됩니다.
 *
 * 설치 방법:
 * 1. Google Sheets 열기
 * 2. 확장 프로그램 → Apps Script 클릭
 * 3. 이 코드 전체를 붙여넣기
 * 4. WEBHOOK_URL을 실제 URL로 변경
 * 5. 저장 (Ctrl+S)
 * 6. 실행 → setupTriggers 함수 실행
 * 7. Google 권한 승인
 *
 * 완료! 이제 시트 수정 시 자동 동기화됩니다.
 */

// ========== 설정 ==========
// 아래 URL을 실제 Netlify 사이트 URL로 변경하세요
const WEBHOOK_URL = 'https://YOUR_NETLIFY_SITE.netlify.app/.netlify/functions/sheets-webhook';

// (선택) 보안을 위한 시크릿 키 - Netlify 환경변수 SHEETS_WEBHOOK_SECRET과 동일하게 설정
const WEBHOOK_SECRET = '';

// ========== 트리거 설정 ==========
/**
 * 트리거 설치 함수 - 최초 1회만 실행
 * Apps Script 에디터에서 이 함수를 직접 실행하세요
 */
function setupTriggers() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // 새 트리거 설치
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 셀 편집 시 트리거
  ScriptApp.newTrigger('onEditHandler')
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  // 행 삽입/삭제 시 트리거 (onChange)
  ScriptApp.newTrigger('onChangeHandler')
    .forSpreadsheet(spreadsheet)
    .onChange()
    .create();

  Logger.log('✅ 트리거가 설치되었습니다!');
  SpreadsheetApp.getUi().alert('✅ 실시간 연동이 활성화되었습니다!\n\n시트를 수정하면 자동으로 DB에 반영됩니다.');
}

/**
 * 트리거 제거 함수
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log('✅ 모든 트리거가 제거되었습니다.');
  SpreadsheetApp.getUi().alert('✅ 실시간 연동이 비활성화되었습니다.');
}

// ========== 이벤트 핸들러 ==========

/**
 * 셀 편집 이벤트 핸들러
 */
function onEditHandler(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

    // 편집된 행 번호 (1-indexed)
    const row = e.range.getRow();

    // 헤더 행은 무시
    if (row === 1) return;

    // 해당 행의 데이터 가져오기
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    // 데이터가 비어있으면 무시
    if (rowData.every(cell => cell === '' || cell === null)) return;

    // 헤더-값 매핑
    const data = {};
    headers.forEach((header, i) => {
      if (header && rowData[i] !== undefined) {
        data[header] = rowData[i];
      }
    });

    // Webhook 호출
    sendWebhook({
      action: 'edit',
      spreadsheetId: spreadsheetId,
      sheetName: sheetName,
      rowIndex: row,
      rowData: data
    });

  } catch (error) {
    Logger.log('onEditHandler error: ' + error.message);
  }
}

/**
 * 시트 변경 이벤트 핸들러 (행 삽입/삭제)
 */
function onChangeHandler(e) {
  try {
    if (!e) return;

    // INSERT_ROW, REMOVE_ROW 등의 변경 감지
    if (e.changeType === 'INSERT_ROW' || e.changeType === 'REMOVE_ROW') {
      // 전체 동기화 트리거 (디바운스)
      triggerFullSync();
    }
  } catch (error) {
    Logger.log('onChangeHandler error: ' + error.message);
  }
}

// ========== Webhook 전송 ==========

/**
 * Webhook 호출 함수
 */
function sendWebhook(payload) {
  try {
    if (WEBHOOK_SECRET) {
      payload.secret = WEBHOOK_SECRET;
    }

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      Logger.log('Webhook failed: ' + response.getContentText());
    } else {
      Logger.log('Webhook success: ' + payload.action + ' row ' + payload.rowIndex);
    }

  } catch (error) {
    Logger.log('sendWebhook error: ' + error.message);
  }
}

// ========== 전체 동기화 ==========

/**
 * 전체 시트 동기화 (수동 실행 가능)
 */
function fullSync() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    const sheetName = sheet.getName();
    const spreadsheetId = spreadsheet.getId();

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('No data to sync');
      return;
    }

    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const rowData = {};
      headers.forEach((header, j) => {
        if (header && data[i][j] !== undefined) {
          rowData[header] = data[i][j];
        }
      });

      // 빈 행 제외
      if (Object.values(rowData).some(v => v !== '' && v !== null)) {
        rows.push({
          rowIndex: i + 1, // 1-indexed
          data: rowData
        });
      }
    }

    if (rows.length === 0) {
      Logger.log('No valid rows to sync');
      return;
    }

    // Webhook 호출
    sendWebhook({
      action: 'bulk_sync',
      spreadsheetId: spreadsheetId,
      sheetName: sheetName,
      rows: rows
    });

    SpreadsheetApp.getUi().alert('✅ ' + rows.length + '개 행이 동기화되었습니다!');

  } catch (error) {
    Logger.log('fullSync error: ' + error.message);
    SpreadsheetApp.getUi().alert('❌ 동기화 실패: ' + error.message);
  }
}

/**
 * 전체 동기화 트리거 (디바운스용)
 */
let syncTimeout = null;
function triggerFullSync() {
  // 이미 예약된 동기화가 있으면 취소
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // 5초 후 전체 동기화 실행
  syncTimeout = Utilities.sleep(5000);
  fullSync();
}

// ========== 메뉴 추가 ==========

/**
 * 스프레드시트 열 때 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 실시간 연동')
    .addItem('📡 실시간 연동 활성화', 'setupTriggers')
    .addItem('🔌 실시간 연동 비활성화', 'removeTriggers')
    .addSeparator()
    .addItem('🔄 전체 동기화', 'fullSync')
    .addItem('ℹ️ 연동 상태 확인', 'checkStatus')
    .addToUi();
}

/**
 * 연동 상태 확인
 */
function checkStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  const status = triggers.length > 0 ? '✅ 활성화됨' : '❌ 비활성화됨';
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  const message =
    '실시간 연동 상태: ' + status + '\n\n' +
    '스프레드시트 ID:\n' + spreadsheetId + '\n\n' +
    'Webhook URL:\n' + WEBHOOK_URL + '\n\n' +
    '활성 트리거 수: ' + triggers.length;

  SpreadsheetApp.getUi().alert(message);
}
