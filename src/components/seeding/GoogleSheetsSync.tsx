import { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ExternalLink,
  Zap,
  Copy,
} from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { SeedingProject } from '../../types';

interface GoogleSheetsSyncProps {
  isOpen: boolean;
  onClose: () => void;
  project: SeedingProject;
  onSyncComplete?: () => void;
}

export default function GoogleSheetsSync({
  isOpen,
  onClose,
  project,
  onSyncComplete,
}: GoogleSheetsSyncProps) {
  // 폼 상태
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [error, setError] = useState<string | null>(null);

  // 스토어
  const { updateProject } = useSeedingStore();

  // 모달 열릴 때 초기화 및 저장된 URL 로드
  useEffect(() => {
    if (isOpen) {
      setError(null);

      // 저장된 시트 URL 불러오기
      if (project.listup_sheet_url) {
        setSpreadsheetUrl(project.listup_sheet_url);
      }
      if (project.listup_sheet_name) {
        setSheetName(project.listup_sheet_name);
      }
    }
  }, [isOpen, project.listup_sheet_url, project.listup_sheet_name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Google Sheets 연동
                </h2>
                <p className="text-sm text-gray-500">{project.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* 스프레드시트 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스프레드시트 URL 또는 ID
                </label>
                <input
                  type="text"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Google 스프레드시트 URL을 붙여넣거나 스프레드시트 ID를 입력하세요
                </p>
              </div>

              {/* 시트명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시트명
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* 실시간 연동 설정 */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-emerald-900">실시간 연동</span>
                      <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-700 text-[10px] font-medium rounded">추천</span>
                    </div>
                    <div className="text-xs text-emerald-700 mb-3">
                      시트 수정 시 1-2초 내 자동 반영 (Google Apps Script 설치 필요)
                    </div>
                    <button
                      onClick={() => {
                        const webhookUrl = 'https://operatiom20251207.netlify.app/.netlify/functions/sheets-webhook';
                        const scriptCode = `const WEBHOOK_URL = '${webhookUrl}';

function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onEditHandler').forSpreadsheet(spreadsheet).onEdit().create();

  SpreadsheetApp.getUi().alert('✅ 실시간 연동 활성화됨!');
}

function onEditHandler(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  if (row === 1) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const data = {};
  headers.forEach((h, i) => { if (h) data[h] = rowData[i]; });

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      action: 'edit',
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      sheetName: sheet.getName(),
      rowIndex: row,
      rowData: data
    })
  });
}`;
                        navigator.clipboard.writeText(scriptCode);
                        alert('Apps Script 코드가 복사되었습니다!\n\n설정 방법:\n1. Google Sheets → 확장 프로그램 → Apps Script\n2. 복사한 코드 붙여넣기\n3. setupTriggers 함수 실행 (▶ 버튼)');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      스크립트 복사
                    </button>
                  </div>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <a
              href={spreadsheetUrl.includes('docs.google.com') ? spreadsheetUrl : `https://docs.google.com/spreadsheets/d/${spreadsheetUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              스프레드시트 열기
            </a>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!spreadsheetUrl.trim()) {
                    setError('스프레드시트 URL을 입력하세요.');
                    return;
                  }
                  try {
                    await updateProject(project.id, {
                      listup_sheet_url: spreadsheetUrl,
                      listup_sheet_name: sheetName,
                    });
                    onSyncComplete?.();
                    onClose();
                  } catch (err: any) {
                    setError(err.message || '저장에 실패했습니다.');
                  }
                }}
                disabled={!spreadsheetUrl.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
