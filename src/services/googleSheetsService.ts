/**
 * Google Sheets 연동 서비스
 * Netlify Function을 통한 스프레드시트 동기화
 */

// ========== 타입 정의 ==========

export interface PreviewResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  mappedFields: string[];
  unmappedHeaders: string[];
  columnMapping: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  added: number;
  updated: number;
  errors: string[];
  data: any[];
}

export interface ExportResult {
  success: boolean;
  rows: number;
}

export interface SyncParams {
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
}

export interface ExportData extends SyncParams {
  data: any[];
}

// ========== API 엔드포인트 ==========

const API_ENDPOINT = '/.netlify/functions/google-sheets-sync';

// ========== 서비스 ==========

export const googleSheetsService = {
  /**
   * 스프레드시트 URL에서 ID 추출
   */
  extractSpreadsheetId(input: string): string {
    if (!input.includes('/')) {
      return input;
    }
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  },

  /**
   * 스프레드시트 미리보기
   * 컬럼 매핑 및 데이터 미리보기 제공
   */
  async previewImport(params: {
    spreadsheetId: string;
    sheetName: string;
  }): Promise<PreviewResult> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        spreadsheetId: this.extractSpreadsheetId(params.spreadsheetId),
        sheetName: params.sheetName || 'Sheet1',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Preview failed');
    }

    return response.json();
  },

  /**
   * 스프레드시트에서 데이터 가져오기 (Import)
   */
  async importFromSheets(params: SyncParams): Promise<ImportResult> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import',
        spreadsheetId: this.extractSpreadsheetId(params.spreadsheetId),
        sheetName: params.sheetName || 'Sheet1',
        projectId: params.projectId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }

    return response.json();
  },

  /**
   * DB 데이터를 스프레드시트로 내보내기 (Export)
   */
  async exportToSheets(params: ExportData): Promise<ExportResult> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'export',
        spreadsheetId: this.extractSpreadsheetId(params.spreadsheetId),
        sheetName: params.sheetName || 'Sheet1',
        projectId: params.projectId,
        data: params.data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }

    return response.json();
  },

  /**
   * 컬럼 매핑 정보 (참조용)
   */
  getColumnMapping(): Record<string, string> {
    return {
      '계정ID': 'account_id',
      '계정명': 'account_name',
      '이메일': 'email',
      '연락처': 'phone',
      '플랫폼': 'platform',
      '팔로워': 'follower_count',
      '카테고리': 'category',
      '프로필URL': 'profile_url',
      '무가/유가': 'seeding_type',
      '콘텐츠유형': 'content_type',
      '원고비': 'fee',
      '상태': 'status',
      '수령인': 'shipping.recipient_name',
      '배송연락처': 'shipping.phone',
      '주소': 'shipping.address',
      '수량': 'shipping.quantity',
      '택배사': 'shipping.carrier',
      '송장번호': 'shipping.tracking_number',
      '메모': 'notes',
    };
  },

  /**
   * 상태값 매핑 (한글 ↔ 영문)
   */
  getStatusMapping(): { toEnglish: Record<string, string>; toKorean: Record<string, string> } {
    const toEnglish: Record<string, string> = {
      '리스트업': 'listed',
      '연락완료': 'contacted',
      '수락': 'accepted',
      '거절': 'rejected',
      '발송완료': 'shipped',
      '가이드발송': 'guide_sent',
      '포스팅완료': 'posted',
      '완료': 'completed',
    };

    const toKorean = Object.entries(toEnglish).reduce(
      (acc, [korean, english]) => ({ ...acc, [english]: korean }),
      {} as Record<string, string>
    );

    return { toEnglish, toKorean };
  },

  /**
   * 스프레드시트 템플릿 URL 생성
   */
  getTemplateUrl(): string {
    return 'https://docs.google.com/spreadsheets/d/your-template-id/copy';
  },

  /**
   * 스프레드시트 기본 헤더 목록
   */
  getDefaultHeaders(): string[] {
    return [
      '계정ID',
      '계정명',
      '이메일',
      '연락처',
      '플랫폼',
      '팔로워',
      '카테고리',
      '무가/유가',
      '콘텐츠유형',
      '원고비',
      '상태',
      '수령인',
      '배송연락처',
      '주소',
      '수량',
      '택배사',
      '송장번호',
      '메모',
    ];
  },
};

export default googleSheetsService;
