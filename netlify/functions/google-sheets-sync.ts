import { Handler, HandlerEvent } from '@netlify/functions';
import { google, sheets_v4 } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 타입 ==========
interface ImportParams {
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
}

interface PreviewParams {
  spreadsheetId: string;
  sheetName: string;
}

// ========== 헤더 매핑 (시트 헤더 → DB 필드) ==========
const HEADER_MAP: Record<string, string> = {
  // 날짜 (다양한 변형 추가)
  'Date': 'listed_at',
  'date': 'listed_at',
  'DATE': 'listed_at',
  '날짜': 'listed_at',
  '등록일': 'listed_at',
  '리스트업일': 'listed_at',
  '리스트업': 'listed_at',
  'Listed': 'listed_at',
  'listed': 'listed_at',
  'Listed Date': 'listed_at',
  'ListedDate': 'listed_at',

  // 팔로워
  'Follower': 'follower_count',
  'follower': 'follower_count',
  'FOLLOWER': 'follower_count',
  'Followers': 'follower_count',
  'followers': 'follower_count',
  'FOLLOWERS': 'follower_count',
  '팔로워': 'follower_count',
  '팔로워수': 'follower_count',

  // 팔로잉 (다양한 변형 추가)
  'Following': 'following_count',
  'following': 'following_count',
  'FOLLOWING': 'following_count',
  'Followings': 'following_count',
  '팔로잉': 'following_count',
  '팔로잉수': 'following_count',

  // 이메일
  'E-mail': 'email',
  'Email': 'email',
  'email': 'email',
  '이메일': 'email',

  // URL
  'URL': 'profile_url',
  'url': 'profile_url',
  'URL(youtube, instagram)': 'profile_url',
  '프로필URL': 'profile_url',
  '링크': 'profile_url',

  // 제품 (다양한 변형 추가)
  'Product': 'product_name',
  'product': 'product_name',
  'No) Product': 'product_name',
  'No)Product': 'product_name',
  '제품명': 'product_name',
  '제품': 'product_name',

  // 가격 (Cost는 매핑하지 않음 - 무시)
  'Price': 'product_price',
  'price': 'product_price',
  '가격': 'product_price',
  '제품단가': 'product_price',
  '단가': 'product_price',

  // 메모
  'NOTE': 'notes',
  'Note': 'notes',
  'note': 'notes',
  '메모': 'notes',
  '비고': 'notes',

  // 발송일자 (upload date 포함)
  'shipped date': 'shipped_at',
  'Shipped Date': 'shipped_at',
  'upload date': 'shipped_at',
  'Upload date': 'shipped_at',
  'Upload Date': 'shipped_at',
  'upload date (MM/D)': 'shipped_at',
  'upload date (MM/DD)': 'shipped_at',
  '발송일': 'shipped_at',
  '발송일자': 'shipped_at',
  '배송일': 'shipped_at',

  // 상태 판별용
  'DM sent (Yes/No)': '_dm_sent',
  'DM sent': '_dm_sent',
  'Response received (Yes/No)': '_response_received',
  'acceptance (Yes/No)': '_acceptance',
  'Product Shipment (Yes/No)': '_shipped',
  'Product Shipment': '_shipped',
  '발송': '_shipped',
  '발송여부': '_shipped',

  // 수락일자 (acceptance date)
  'acceptance date': 'accepted_at',
  'Acceptance Date': 'accepted_at',
  'Acceptance date': 'accepted_at',
  'accepted date': 'accepted_at',
  'Accepted Date': 'accepted_at',
  '수락일': 'accepted_at',
  '수락일자': 'accepted_at',
};

// ========== 유틸 함수 ==========

// 스프레드시트 ID 추출
function extractSpreadsheetId(input: string): string {
  if (!input.includes('/')) return input;
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

// URL에서 계정 ID 추출
function extractAccountId(url: string): string | null {
  if (!url) return null;

  // @로 시작하면 그대로 반환
  if (url.startsWith('@')) return url;

  // Instagram URL
  const igMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (igMatch) return `@${igMatch[1]}`;

  // YouTube URL
  const ytMatch = url.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i);
  if (ytMatch) return `@${ytMatch[1]}`;

  // TikTok URL
  const ttMatch = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i);
  if (ttMatch) return `@${ttMatch[1]}`;

  // 텍스트에서 @username 추출
  const atMatch = url.match(/@([a-zA-Z0-9._-]+)/);
  if (atMatch) return `@${atMatch[1]}`;

  return null;
}

// 숫자 파싱 (K, M 단위 지원)
function parseNum(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const str = String(value).trim().toLowerCase();
  if (!str) return 0;

  // K 단위
  const kMatch = str.match(/^([\d,.]+)\s*k$/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(/,/g, '')) * 1000);

  // M 단위
  const mMatch = str.match(/^([\d,.]+)\s*m$/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1].replace(/,/g, '')) * 1000000);

  // 일반 숫자
  const num = parseFloat(str.replace(/[,\s]/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
}

// 날짜 파싱 → ISO 형식
function parseDate(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str) return null;

  // 이미 ISO 형식
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];

  // YYYY.MM.DD 또는 YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD (현재 연도)
  const mmdd = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const [, m, d] = mmdd;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 한글: 12월4일, 12월 4일
  const korean = str.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
  if (korean) {
    const [, m, d] = korean;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 한글 with 연도: 2025년12월4일
  const koreanFull = str.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?$/);
  if (koreanFull) {
    const [, y, m, d] = koreanFull;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Google Sheets 시리얼 날짜
  const serial = parseFloat(str);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  return null;
}

// Yes/No 판별
function isYes(value: any): boolean {
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return ['o', 'yes', 'y', '예', 'true', '1'].includes(str);
}

// ========== Google Sheets 인증 ==========
async function getSheets(): Promise<sheets_v4.Sheets> {
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
    throw new Error('Google 서비스 계정 인증 정보가 없습니다.');
  }

  const auth = new google.auth.JWT({
    email: emailData.value,
    key: keyData.value.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// ========== 미리보기 ==========
async function preview(params: PreviewParams) {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${params.sheetName}!A1:Z100`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0, mappedFields: [], unmappedHeaders: [] };
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  const mappedFields: string[] = [];
  const unmappedHeaders: string[] = [];

  headers.forEach((h) => {
    const clean = h.trim().replace(/^["'\n]+|["'\n]+$/g, '');
    const field = HEADER_MAP[h] || HEADER_MAP[clean];
    if (field && !field.startsWith('_')) {
      if (!mappedFields.includes(field)) mappedFields.push(field);
    } else if (!field) {
      unmappedHeaders.push(h);
    }
  });

  const previewRows = dataRows.slice(0, 10).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });

  return {
    headers,
    rows: previewRows,
    totalRows: dataRows.length,
    mappedFields,
    unmappedHeaders,
  };
}

// ========== 가져오기 ==========
async function importData(params: ImportParams) {
  const sheets = await getSheets();
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${params.sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return { success: true, added: 0, updated: 0, errors: ['데이터가 없습니다.'], data: [] };
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  // 헤더 인덱스 매핑 (대소문자 무시)
  const fieldIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const clean = h.trim().replace(/^["'\n]+|["'\n]+$/g, '');
    // 정확한 매칭 시도
    let field = HEADER_MAP[h] || HEADER_MAP[clean];

    // 대소문자 무시하고 재시도
    if (!field) {
      const lowerClean = clean.toLowerCase();
      for (const [key, value] of Object.entries(HEADER_MAP)) {
        if (key.toLowerCase() === lowerClean) {
          field = value;
          break;
        }
      }
    }

    if (field) {
      fieldIndex[field] = i;
      console.log(`[헤더 매핑] "${h}" (clean: "${clean}") → ${field} (index: ${i})`);
    } else {
      console.log(`[헤더 매핑 실패] "${h}" (clean: "${clean}")`);
    }
  });

  console.log('[importData] Field index mapping:', JSON.stringify(fieldIndex));

  const results: any[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIdx) => {
    try {
      // 셀 값 가져오기 헬퍼
      const get = (field: string) => {
        const idx = fieldIndex[field];
        return idx !== undefined ? row[idx] : undefined;
      };

      // 계정 ID 추출
      let accountId = extractAccountId(get('profile_url') || '');
      if (!accountId) {
        // 프로필 URL이 없으면 스킵
        errors.push(`행 ${rowIdx + 2}: 계정ID를 찾을 수 없습니다.`);
        return;
      }

      // 상태 결정
      let status = 'listed';
      if (isYes(get('_shipped'))) status = 'shipped';
      else if (isYes(get('_acceptance'))) status = 'accepted';
      else if (isYes(get('_response_received')) || isYes(get('_dm_sent'))) status = 'contacted';

      // 레코드 생성 - 모든 필드를 명시적으로 설정
      const record: any = {
        project_id: params.projectId,
        account_id: accountId,
        platform: 'instagram',
        seeding_type: 'free',
        content_type: 'story',
        status,
        shipping: { recipient_name: '', phone: '', address: '', quantity: 1 },
        sheet_row_index: rowIdx + 2,
      };

      // ========== 원본 헤더 값도 함께 저장 (프론트엔드 fallback용) ==========
      // 헤더 매핑이 실패해도 프론트엔드에서 처리할 수 있도록
      headers.forEach((h, i) => {
        if (row[i] !== undefined && row[i] !== null && row[i] !== '') {
          record[h] = row[i];  // 원본 헤더명으로도 값 저장
        }
      });

      // 날짜 필드 - 매핑 실패 시 원본 헤더에서 직접 가져오기
      const listedAtRaw = get('listed_at') || record['Date'] || record['date'] || record['DATE'] || record['날짜'];
      record.listed_at = listedAtRaw ? parseDate(listedAtRaw) : null;

      // 발송일자 필드 (upload date 포함)
      const shippedAtRaw = get('shipped_at') || record['shipped date'] || record['Shipped Date'] || record['upload date'] || record['Upload date'] || record['Upload Date'] || record['upload date (MM/D)'] || record['upload date (MM/DD)'] || record['발송일'] || record['발송일자'];
      if (shippedAtRaw) {
        record.shipped_at = parseDate(shippedAtRaw);
      }

      // 수락일자 필드
      const acceptedAtRaw = get('accepted_at') || record['acceptance date'] || record['Acceptance Date'] || record['Acceptance date'] || record['수락일'] || record['수락일자'];
      if (acceptedAtRaw) {
        record.accepted_at = parseDate(acceptedAtRaw);
        // 수락일자가 있으면 상태를 accepted로 변경
        if (record.accepted_at && record.status === 'listed') {
          record.status = 'accepted';
        }
      }

      // 숫자 필드 - 매핑 실패 시 원본 헤더에서 직접 가져오기
      const followerRaw = get('follower_count') || record['Follower'] || record['follower'] || record['FOLLOWER'] || record['팔로워'];
      record.follower_count = followerRaw ? parseNum(followerRaw) : 0;

      const followingRaw = get('following_count') || record['Following'] || record['following'] || record['FOLLOWING'] || record['팔로잉'];
      record.following_count = followingRaw ? parseNum(followingRaw) : 0;

      // 가격 - 매핑 실패 시 원본 헤더에서 직접 가져오기 (Cost는 무시)
      const priceRaw = get('product_price') || record['price'] || record['Price'] || record['가격'];
      if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
        const price = parseNum(priceRaw);
        if (price > 0) record.product_price = price;
      }

      // 문자열 필드
      const email = get('email');
      if (email) record.email = String(email).trim();

      const profileUrl = get('profile_url');
      if (profileUrl) record.profile_url = String(profileUrl).trim();

      // 제품명 - 매핑 실패 시 원본 헤더에서 직접 가져오기
      const productName = get('product_name') || record['Product'] || record['product'] || record['No) Product'] || record['제품'] || record['제품명'];
      if (productName) record.product_name = String(productName).trim();

      const notes = get('notes');
      if (notes) record.notes = String(notes).trim();

      // 첫 번째 행 디버깅
      if (rowIdx === 0) {
        console.log('[importData] First row raw values (from fieldIndex mapping):');
        console.log('  listed_at raw:', listedAtRaw);
        console.log('  follower_count raw:', followerRaw);
        console.log('  following_count raw:', followingRaw);
        console.log('  product_price raw:', priceRaw);
        console.log('[importData] Original header values in record:');
        console.log('  Date:', record['Date']);
        console.log('  Following:', record['Following']);
        console.log('  Follower:', record['Follower']);
        console.log('[importData] First record:', JSON.stringify(record, null, 2));
      }

      results.push(record);
    } catch (err: any) {
      errors.push(`행 ${rowIdx + 2}: ${err.message}`);
    }
  });

  console.log(`[importData] Total: ${results.length} records, ${errors.length} errors`);

  return {
    success: true,
    added: results.length,
    updated: 0,
    errors,
    data: results,
    // 디버깅 정보 추가
    debug: {
      headers: headers,
      fieldIndex: fieldIndex,
      firstRow: dataRows[0],
      firstRecord: results[0],
    },
  };
}

// ========== Handler ==========
const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, ...params } = body;

    let result;
    switch (action) {
      case 'preview':
        result = await preview(params);
        break;
      case 'import':
        result = await importData(params);
        break;
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

export { handler };
