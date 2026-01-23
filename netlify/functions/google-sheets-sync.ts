import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { google, sheets_v4 } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// ========== Supabase 클라이언트 ==========
// Netlify Functions는 VITE_ 접두사 환경변수에 접근할 수 없음
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 타입 정의 ==========

interface ImportParams {
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
}

interface ExportParams {
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
  data: any[];
}

interface PreviewParams {
  spreadsheetId: string;
  sheetName: string;
}

interface SyncResult {
  success: boolean;
  added?: number;
  updated?: number;
  rows?: number;
  errors?: string[];
  data?: any;
}

// ========== 컬럼 매핑 ==========

// 스프레드시트 헤더 → DB 필드
const columnMapping: Record<string, string> = {
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

// DB 필드 → 스프레드시트 헤더 (역매핑)
const reverseColumnMapping: Record<string, string> = Object.entries(columnMapping).reduce(
  (acc, [header, field]) => ({ ...acc, [field]: header }),
  {}
);

// 상태값 매핑 (한글 → 영문)
const statusToEnglish: Record<string, string> = {
  '리스트업': 'listed',
  '연락완료': 'contacted',
  '수락': 'accepted',
  '거절': 'rejected',
  '발송완료': 'shipped',
  '가이드발송': 'guide_sent',
  '포스팅완료': 'posted',
  '완료': 'completed',
};

// 상태값 매핑 (영문 → 한글)
const statusToKorean: Record<string, string> = Object.entries(statusToEnglish).reduce(
  (acc, [korean, english]) => ({ ...acc, [english]: korean }),
  {}
);

// 플랫폼 매핑
const platformMapping: Record<string, string> = {
  '인스타그램': 'instagram',
  '유튜브': 'youtube',
  '틱톡': 'tiktok',
  '블로그': 'blog',
};

const platformReverseMapping: Record<string, string> = Object.entries(platformMapping).reduce(
  (acc, [korean, english]) => ({ ...acc, [english]: korean }),
  {}
);

// 시딩 유형 매핑
const seedingTypeMapping: Record<string, string> = {
  '무가': 'free',
  '유가': 'paid',
};

const seedingTypeReverseMapping: Record<string, string> = Object.entries(seedingTypeMapping).reduce(
  (acc, [korean, english]) => ({ ...acc, [english]: korean }),
  {}
);

// 콘텐츠 유형 매핑
const contentTypeMapping: Record<string, string> = {
  '스토리': 'story',
  '릴스': 'reels',
  '피드': 'feed',
  '스토리+릴스': 'both',
};

const contentTypeReverseMapping: Record<string, string> = Object.entries(contentTypeMapping).reduce(
  (acc, [korean, english]) => ({ ...acc, [english]: korean }),
  {}
);

// ========== Google Sheets 인증 ==========

async function getGoogleCredentials(): Promise<{ email: string; privateKey: string }> {
  const { data: emailData } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', 'GOOGLE_SERVICE_ACCOUNT_EMAIL')
    .single();

  const { data: keyData } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', 'GOOGLE_PRIVATE_KEY')
    .single();

  if (!emailData?.value || !keyData?.value) {
    throw new Error('Google 서비스 계정 인증 정보가 설정되지 않았습니다.');
  }

  return {
    email: emailData.value,
    privateKey: keyData.value.replace(/\\n/g, '\n'),
  };
}

async function getSheets(): Promise<sheets_v4.Sheets> {
  const { email, privateKey } = await getGoogleCredentials();

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// ========== 유틸리티 함수 ==========

// 스프레드시트 URL에서 ID 추출
function extractSpreadsheetId(input: string): string {
  // 이미 ID인 경우
  if (!input.includes('/')) {
    return input;
  }
  // URL에서 ID 추출
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

// 중첩 객체에 값 설정 (예: shipping.phone)
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

// 중첩 객체에서 값 가져오기
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

// 값 변환 (스프레드시트 → DB)
function convertValueToDb(field: string, value: any): any {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (field) {
    case 'status':
      return statusToEnglish[value] || value;
    case 'platform':
      return platformMapping[value] || value;
    case 'seeding_type':
      return seedingTypeMapping[value] || value;
    case 'content_type':
      return contentTypeMapping[value] || value;
    case 'follower_count':
    case 'fee':
    case 'shipping.quantity':
      const num = parseInt(String(value).replace(/[,\s]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    default:
      return String(value).trim();
  }
}

// 값 변환 (DB → 스프레드시트)
function convertValueToSheet(field: string, value: any): string {
  if (value === undefined || value === null) {
    return '';
  }

  switch (field) {
    case 'status':
      return statusToKorean[value] || value;
    case 'platform':
      return platformReverseMapping[value] || value;
    case 'seeding_type':
      return seedingTypeReverseMapping[value] || value;
    case 'content_type':
      return contentTypeReverseMapping[value] || value;
    case 'follower_count':
    case 'fee':
      return Number(value).toLocaleString();
    default:
      return String(value);
  }
}

// ========== 핵심 기능 ==========

// 스프레드시트 미리보기
async function previewSheets(params: PreviewParams): Promise<any> {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${params.sheetName}!A1:Z100`, // 최대 100행 미리보기
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return { headers: [], rows: [], mappedFields: [], unmappedHeaders: [] };
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  // 매핑된 필드와 매핑되지 않은 헤더 분류
  const mappedFields: string[] = [];
  const unmappedHeaders: string[] = [];

  headers.forEach((header) => {
    if (columnMapping[header]) {
      mappedFields.push(columnMapping[header]);
    } else {
      unmappedHeaders.push(header);
    }
  });

  // 데이터 미리보기 (최대 10행)
  const previewData = dataRows.slice(0, 10).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  return {
    headers,
    rows: previewData,
    totalRows: dataRows.length,
    mappedFields,
    unmappedHeaders,
    columnMapping,
  };
}

// 스프레드시트에서 데이터 가져오기
async function importFromSheets(params: ImportParams): Promise<SyncResult> {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${params.sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return { success: true, added: 0, updated: 0, errors: ['데이터가 없습니다.'] };
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  const results: any[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIndex) => {
    try {
      const record: any = {
        project_id: params.projectId,
        shipping: {
          recipient_name: '',
          phone: '',
          address: '',
          quantity: 1,
        },
      };

      headers.forEach((header, colIndex) => {
        const field = columnMapping[header];
        if (field) {
          const value = convertValueToDb(field, row[colIndex]);
          if (value !== undefined) {
            setNestedValue(record, field, value);
          }
        }
      });

      // 필수 필드 검증
      if (!record.account_id) {
        errors.push(`행 ${rowIndex + 2}: 계정ID가 없습니다.`);
        return;
      }

      // 기본값 설정
      if (!record.platform) record.platform = 'instagram';
      if (!record.seeding_type) record.seeding_type = 'free';
      if (!record.content_type) record.content_type = 'story';
      if (!record.status) record.status = 'listed';
      if (!record.follower_count) record.follower_count = 0;

      // 행 인덱스 저장 (동기화용)
      record.sheet_row_index = rowIndex + 2; // 1-indexed, 헤더 제외

      results.push(record);
    } catch (err: any) {
      errors.push(`행 ${rowIndex + 2}: ${err.message}`);
    }
  });

  return {
    success: true,
    added: results.length,
    updated: 0,
    errors,
    data: results,
  };
}

// DB 데이터를 스프레드시트로 내보내기
async function exportToSheets(params: ExportParams): Promise<SyncResult> {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  // 기본 헤더 설정
  const headers = [
    '계정ID', '계정명', '이메일', '연락처', '플랫폼', '팔로워',
    '카테고리', '무가/유가', '콘텐츠유형', '원고비', '상태',
    '수령인', '배송연락처', '주소', '수량', '택배사', '송장번호', '메모'
  ];

  const fields = headers.map((h) => columnMapping[h]);

  // 데이터 행 생성
  const dataRows = params.data.map((record) => {
    return headers.map((header) => {
      const field = columnMapping[header];
      const value = getNestedValue(record, field);
      return convertValueToSheet(field, value);
    });
  });

  // 전체 데이터 (헤더 + 데이터)
  const values = [headers, ...dataRows];

  // 시트 클리어 후 쓰기
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${params.sheetName}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${params.sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return {
    success: true,
    rows: dataRows.length,
  };
}

// ========== Handler ==========

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // 환경변수 체크
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Supabase 환경변수가 설정되지 않았습니다. Netlify에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.',
        }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, ...params } = body;

    let result: any;

    switch (action) {
      case 'preview':
        result = await previewSheets(params);
        break;

      case 'import':
        result = await importFromSheets(params);
        break;

      case 'export':
        result = await exportToSheets(params);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Google Sheets Sync Error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.errors || undefined,
      }),
    };
  }
};

export { handler };
