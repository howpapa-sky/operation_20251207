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

// 스프레드시트 헤더 → DB 필드 (한글 + 영문 + 다양한 변형 지원)
const columnMapping: Record<string, string> = {
  // 계정 정보
  '계정ID': 'account_id',
  '계정': 'account_id',
  'account_id': 'account_id',
  'Account ID': 'account_id',
  'ID': 'account_id',

  '계정명': 'account_name',
  '이름': 'account_name',
  'name': 'account_name',
  'Name': 'account_name',
  '닉네임': 'account_name',

  // 이메일
  '이메일': 'email',
  'email': 'email',
  'Email': 'email',
  'E-mail': 'email',
  'e-mail': 'email',
  '메일': 'email',

  // 연락처
  '연락처': 'phone',
  '전화번호': 'phone',
  'phone': 'phone',
  'Phone': 'phone',
  '휴대폰': 'phone',

  // 플랫폼
  '플랫폼': 'platform',
  'platform': 'platform',
  'Platform': 'platform',

  // 팔로워
  '팔로워': 'follower_count',
  '팔로워수': 'follower_count',
  'follower': 'follower_count',
  'Follower': 'follower_count',
  'followers': 'follower_count',
  'Followers': 'follower_count',
  '구독자': 'follower_count',
  '구독자수': 'follower_count',

  // 카테고리
  '카테고리': 'category',
  'category': 'category',
  'Category': 'category',
  '분야': 'category',

  // 프로필 URL (계정ID 추출용)
  '프로필URL': 'profile_url',
  'URL': 'profile_url',
  'url': 'profile_url',
  'URL(youtube, instagram)': 'profile_url',
  '인스타그램': 'profile_url',
  '유튜브': 'profile_url',
  'instagram': 'profile_url',
  'Instagram': 'profile_url',
  'youtube': 'profile_url',
  'Youtube': 'profile_url',
  'YouTube': 'profile_url',
  '링크': 'profile_url',
  'link': 'profile_url',
  'Link': 'profile_url',
  '프로필': 'profile_url',

  // 시딩 유형
  '무가/유가': 'seeding_type',
  '유형': 'seeding_type',
  '시딩유형': 'seeding_type',
  'type': 'seeding_type',
  'Type': 'seeding_type',

  // 콘텐츠 유형
  '콘텐츠유형': 'content_type',
  '콘텐츠': 'content_type',
  'content': 'content_type',
  'Content': 'content_type',

  // 원고비
  '원고비': 'fee',
  '비용': 'fee',
  'fee': 'fee',
  'Fee': 'fee',
  '금액': 'fee',

  // 상태
  '상태': 'status',
  'status': 'status',
  'Status': 'status',

  // 배송 정보
  '수령인': 'shipping.recipient_name',
  '받는분': 'shipping.recipient_name',
  '배송연락처': 'shipping.phone',
  '주소': 'shipping.address',
  '배송주소': 'shipping.address',
  'address': 'shipping.address',
  'Address': 'shipping.address',
  '수량': 'shipping.quantity',
  '택배사': 'shipping.carrier',
  '송장번호': 'shipping.tracking_number',
  '운송장번호': 'shipping.tracking_number',
  '운송장': 'shipping.tracking_number',

  // 메모
  '메모': 'notes',
  'memo': 'notes',
  'Memo': 'notes',
  'note': 'notes',
  'Note': 'notes',
  'notes': 'notes',
  'Notes': 'notes',
  'NOTE': 'notes',
  '비고': 'notes',

  // 비용/원고비
  'Cost': 'fee',
  'cost': 'fee',

  // 날짜
  'date': 'listed_at',
  'Date': 'listed_at',
  '날짜': 'listed_at',
  '등록일': 'listed_at',

  // 팔로잉 (참고용)
  'Following': 'following_count',
  'following': 'following_count',
  '팔로잉': 'following_count',

  // 진행 상태 (Yes/No → status 변환용)
  'DM sent (Yes/No)': '_dm_sent',
  'DM sent': '_dm_sent',
  'DM': '_dm_sent',
  'Response received (Yes/No)': '_response_received',
  'Response received': '_response_received',
  'Response': '_response_received',
  'acceptance (Yes/No)': '_acceptance',
  'acceptance': '_acceptance',
  '수락': '_acceptance',
  'Product Shipment (Yes/No)': '_product_shipped',
  'Product Shipment': '_product_shipped',
  '발송': '_product_shipped',
  'upload date (MM/DD)': 'posted_at',
  'upload date': 'posted_at',
  '업로드일': 'posted_at',
  'Upload completed': '_upload_completed',
  '업로드완료': '_upload_completed',
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

// ========== URL에서 계정ID 추출 ==========

function extractAccountFromUrl(url: string): { accountId: string | null; platform: string | null } {
  if (!url || typeof url !== 'string') {
    return { accountId: null, platform: null };
  }

  const urlStr = url.trim();

  // Instagram URL 패턴
  // https://www.instagram.com/username/ or https://instagram.com/username
  const instagramMatch = urlStr.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (instagramMatch) {
    return { accountId: `@${instagramMatch[1]}`, platform: 'instagram' };
  }

  // YouTube URL 패턴
  // https://www.youtube.com/@username or https://youtube.com/channel/xxx or https://youtube.com/c/xxx
  const youtubeHandleMatch = urlStr.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9._-]+)/i);
  if (youtubeHandleMatch) {
    return { accountId: `@${youtubeHandleMatch[1]}`, platform: 'youtube' };
  }

  const youtubeChannelMatch = urlStr.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c)\/([a-zA-Z0-9._-]+)/i);
  if (youtubeChannelMatch) {
    return { accountId: youtubeChannelMatch[1], platform: 'youtube' };
  }

  // TikTok URL 패턴
  // https://www.tiktok.com/@username
  const tiktokMatch = urlStr.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)/i);
  if (tiktokMatch) {
    return { accountId: `@${tiktokMatch[1]}`, platform: 'tiktok' };
  }

  // 네이버 블로그 URL 패턴
  // https://blog.naver.com/username
  const naverBlogMatch = urlStr.match(/(?:https?:\/\/)?blog\.naver\.com\/([a-zA-Z0-9._-]+)/i);
  if (naverBlogMatch) {
    return { accountId: naverBlogMatch[1], platform: 'blog' };
  }

  // @ 로 시작하는 경우 (계정ID로 직접 입력된 경우)
  if (urlStr.startsWith('@')) {
    return { accountId: urlStr, platform: null };
  }

  // 그 외의 경우 텍스트에서 @username 패턴 추출 시도
  // "딩이 | 채채맘🐰 (@ding__03)" 형태에서 @ding__03 추출
  const atMatch = urlStr.match(/@([a-zA-Z0-9._-]+)/);
  if (atMatch) {
    return { accountId: `@${atMatch[1]}`, platform: null };
  }

  return { accountId: null, platform: null };
}

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

      // account_id가 없으면 profile_url에서 추출 시도
      if (!record.account_id && record.profile_url) {
        const extracted = extractAccountFromUrl(record.profile_url);
        if (extracted.accountId) {
          record.account_id = extracted.accountId;
          // 플랫폼도 함께 설정 (플랫폼이 없는 경우에만)
          if (!record.platform && extracted.platform) {
            record.platform = extracted.platform;
          }
        }
      }

      // account_name에서도 account_id 추출 시도 (예: "딩이 | 채채맘🐰 (@ding__03)")
      if (!record.account_id && record.account_name) {
        const extracted = extractAccountFromUrl(record.account_name);
        if (extracted.accountId) {
          record.account_id = extracted.accountId;
        }
      }

      // 필수 필드 검증
      if (!record.account_id) {
        errors.push(`행 ${rowIndex + 2}: 계정ID가 없습니다.`);
        return;
      }

      // Yes/No 컬럼들로 status 자동 판별
      // 우선순위: upload_completed > product_shipped > acceptance > dm_sent > listed
      const isYes = (val: any) => {
        if (!val) return false;
        const v = String(val).toLowerCase().trim();
        return v === 'o' || v === 'yes' || v === 'y' || v === '예' || v === 'true' || v === '1';
      };

      if (!record.status) {
        if (isYes(record._upload_completed)) {
          record.status = 'posted';
          // posted_at 설정 (없으면 현재 시간)
          if (!record.posted_at) {
            record.posted_at = new Date().toISOString();
          }
        } else if (isYes(record._product_shipped)) {
          record.status = 'shipped';
        } else if (isYes(record._acceptance)) {
          record.status = 'accepted';
          if (!record.accepted_at) {
            record.accepted_at = new Date().toISOString();
          }
        } else if (isYes(record._response_received) || isYes(record._dm_sent)) {
          record.status = 'contacted';
          if (!record.contacted_at) {
            record.contacted_at = new Date().toISOString();
          }
        } else {
          record.status = 'listed';
        }
      }

      // 임시 필드 제거 (DB에 저장하지 않음)
      delete record._dm_sent;
      delete record._response_received;
      delete record._acceptance;
      delete record._product_shipped;
      delete record._upload_completed;
      delete record.following_count; // DB에 없는 필드
      delete record.listed_at; // created_at으로 대체됨

      // 기본값 설정
      if (!record.platform) record.platform = 'instagram';
      if (!record.seeding_type) record.seeding_type = 'free';
      if (!record.content_type) record.content_type = 'story';
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

// ========== 설문 응답 시트 컬럼 매핑 ==========

const surveyColumnMapping: Record<string, string> = {
  // 인스타그램 아이디 (매칭 키)
  '인스타그램 아이디 (Ex. nucio_official)': 'account_id',
  '인스타그램 아이디': 'account_id',
  '인스타그램아이디': 'account_id',
  'Instagram ID': 'account_id',
  'instagram_id': 'account_id',

  // 배송 정보
  '성함 (받으시는분)': 'shipping.recipient_name',
  '성함': 'shipping.recipient_name',
  '받으시는분': 'shipping.recipient_name',
  '수령인': 'shipping.recipient_name',

  '전화번호': 'shipping.phone',
  '연락처': 'shipping.phone',

  '주소': 'shipping.address',
  '배송주소': 'shipping.address',

  '배송메모': 'shipping.memo',
  '배송 메모': 'shipping.memo',
  '요청사항': 'shipping.memo',

  // 이메일
  '이메일 주소': 'email',
  '이메일': 'email',

  // 기타
  '원하시는 제품 (사전 협의된 제품으로 신청 해주세요)': 'requested_product',
  '원하시는 제품': 'requested_product',
  '제품': 'requested_product',

  '브랜드': 'brand',
  '타임스탬프': 'survey_submitted_at',
};

// 설문 응답에서 배송 정보 동기화
interface SyncSurveyParams {
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
}

async function syncSurveyResponses(params: SyncSurveyParams): Promise<SyncResult> {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  // 설문 응답 시트 읽기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${params.sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return { success: true, updated: 0, errors: ['설문 응답 데이터가 없습니다.'] };
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  const errors: string[] = [];
  let updatedCount = 0;
  let notFoundCount = 0;

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];

    try {
      // 설문 응답 데이터 파싱
      const surveyData: any = {
        shipping: {},
      };

      headers.forEach((header, colIndex) => {
        const field = surveyColumnMapping[header];
        if (field && row[colIndex]) {
          const value = String(row[colIndex]).trim();
          if (value) {
            setNestedValue(surveyData, field, value);
          }
        }
      });

      // account_id 정규화 (@ 제거 후 다시 추가)
      let accountId = surveyData.account_id;
      if (!accountId) {
        continue; // 아이디 없으면 스킵
      }

      // @ 처리
      accountId = accountId.replace(/^@/, '').trim();
      const normalizedAccountId = `@${accountId}`;
      const accountIdWithoutAt = accountId;

      // DB에서 해당 인플루언서 찾기 (프로젝트 내에서)
      const { data: influencers, error: findError } = await supabase
        .from('seeding_influencers')
        .select('id, account_id, shipping')
        .eq('project_id', params.projectId)
        .or(`account_id.eq.${normalizedAccountId},account_id.eq.${accountIdWithoutAt},account_id.ilike.%${accountIdWithoutAt}%`);

      if (findError) {
        errors.push(`행 ${rowIndex + 2}: DB 조회 오류 - ${findError.message}`);
        continue;
      }

      if (!influencers || influencers.length === 0) {
        notFoundCount++;
        continue; // 매칭되는 인플루언서 없음
      }

      // 첫 번째 매칭된 인플루언서 업데이트
      const influencer = influencers[0];

      // 기존 shipping 정보와 병합
      const existingShipping = influencer.shipping || {};
      const updatedShipping = {
        ...existingShipping,
        recipient_name: surveyData.shipping?.recipient_name || existingShipping.recipient_name || '',
        phone: surveyData.shipping?.phone || existingShipping.phone || '',
        address: surveyData.shipping?.address || existingShipping.address || '',
        memo: surveyData.shipping?.memo || existingShipping.memo || '',
      };

      // 업데이트할 데이터 구성
      const updateData: any = {
        shipping: updatedShipping,
        updated_at: new Date().toISOString(),
      };

      // 이메일 업데이트 (기존에 없으면)
      if (surveyData.email) {
        updateData.email = surveyData.email;
      }

      // 요청 제품을 notes에 추가
      if (surveyData.requested_product) {
        updateData.notes = `[요청제품] ${surveyData.requested_product}`;
      }

      // DB 업데이트
      const { error: updateError } = await supabase
        .from('seeding_influencers')
        .update(updateData)
        .eq('id', influencer.id);

      if (updateError) {
        errors.push(`행 ${rowIndex + 2}: 업데이트 오류 - ${updateError.message}`);
        continue;
      }

      updatedCount++;
    } catch (err: any) {
      errors.push(`행 ${rowIndex + 2}: ${err.message}`);
    }
  }

  if (notFoundCount > 0) {
    errors.push(`${notFoundCount}건의 응답이 프로젝트 내 인플루언서와 매칭되지 않았습니다.`);
  }

  return {
    success: true,
    updated: updatedCount,
    errors,
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

      case 'sync-survey':
        result = await syncSurveyResponses(params);
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
