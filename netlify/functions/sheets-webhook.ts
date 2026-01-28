import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// ========== Supabase 클라이언트 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 타입 정의 ==========
interface WebhookPayload {
  action: 'edit' | 'insert' | 'delete' | 'bulk_sync';
  spreadsheetId: string;
  sheetName: string;
  // 단일 행 변경
  rowIndex?: number;
  rowData?: Record<string, any>;
  // 벌크 동기화
  rows?: Array<{ rowIndex: number; data: Record<string, any> }>;
  // 삭제
  deletedRowIndexes?: number[];
  // 인증
  secret?: string;
}

// ========== 헤더 매핑 (시트 헤더 → DB 필드) ==========
const HEADER_MAP: Record<string, string> = {
  // 날짜
  'Date': 'listed_at',
  'date': 'listed_at',
  '날짜': 'listed_at',
  '등록일': 'listed_at',

  // 팔로워
  'Follower': 'follower_count',
  'follower': 'follower_count',
  'Followers': 'follower_count',
  '팔로워': 'follower_count',

  // 팔로잉
  'Following': 'following_count',
  'following': 'following_count',
  '팔로잉': 'following_count',

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

  // 제품
  'Product': 'product_name',
  'product': 'product_name',
  'No) Product': 'product_name',
  '제품명': 'product_name',
  '제품': 'product_name',

  // 가격
  'Price': 'product_price',
  'price': 'product_price',
  '가격': 'product_price',
  '단가': 'product_price',

  // 메모
  'NOTE': 'notes',
  'Note': 'notes',
  'note': 'notes',
  '메모': 'notes',
  '비고': 'notes',

  // 발송일
  'shipped date': 'shipped_at',
  'Shipped Date': 'shipped_at',
  '발송일': 'shipped_at',

  // 업로드 예정
  'upload date': 'posted_at',
  'Upload date': 'posted_at',
  'Upload Date': 'posted_at',
  '업로드예정': 'posted_at',

  // 완료일
  'completed': 'completed_at',
  'Completed': 'completed_at',
  'Upload completed': 'completed_at',
  '완료일': 'completed_at',

  // 수락일
  'acceptance date': 'accepted_at',
  'Acceptance Date': 'accepted_at',
  '수락일': 'accepted_at',

  // 상태 판별용
  'DM sent (Yes/No)': '_dm_sent',
  'DM sent': '_dm_sent',
  'Response received (Yes/No)': '_response_received',
  'acceptance (Yes/No)': '_acceptance',
  'Product Shipment (Yes/No)': '_shipped',
  'Product Shipment': '_shipped',
  '발송': '_shipped',
};

// ========== 유틸 함수 ==========

// URL에서 계정 ID 추출
function extractAccountId(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('@')) return url;

  const igMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (igMatch) return `@${igMatch[1]}`;

  const ytMatch = url.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i);
  if (ytMatch) return `@${ytMatch[1]}`;

  const ttMatch = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i);
  if (ttMatch) return `@${ttMatch[1]}`;

  const atMatch = url.match(/@([a-zA-Z0-9._-]+)/);
  if (atMatch) return `@${atMatch[1]}`;

  return null;
}

// 숫자 파싱
function parseNum(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const str = String(value).trim().toLowerCase();
  if (!str) return 0;

  const kMatch = str.match(/^([\d,.]+)\s*k$/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(/,/g, '')) * 1000);

  const mMatch = str.match(/^([\d,.]+)\s*m$/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1].replace(/,/g, '')) * 1000000);

  const num = parseFloat(str.replace(/[,\s]/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
}

// 날짜 파싱
function parseDate(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];

  const yyyymmdd = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const yymmdd = str.match(/^(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (yymmdd) {
    const [, yy, m, d] = yymmdd;
    const y = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const mmdd = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const [, m, d] = mmdd;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const korean = str.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
  if (korean) {
    const [, m, d] = korean;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

// Yes/No 판별
function isYes(value: any): boolean {
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return ['o', 'yes', 'y', '예', 'true', '1'].includes(str);
}

// 행 데이터 → DB 레코드 변환
function rowToRecord(rowData: Record<string, any>, projectId: string, rowIndex: number): any {
  const record: any = {
    project_id: projectId,
    platform: 'instagram',
    seeding_type: 'free',
    content_type: 'story',
    status: 'listed',
    shipping: { recipient_name: '', phone: '', address: '', quantity: 1 },
    sheet_row_index: rowIndex,
  };

  // 헤더 매핑 적용
  for (const [header, value] of Object.entries(rowData)) {
    const field = HEADER_MAP[header] || HEADER_MAP[header.trim()];
    if (!field) continue;

    if (field === 'profile_url') {
      record.profile_url = String(value).trim();
      const accountId = extractAccountId(record.profile_url);
      if (accountId) record.account_id = accountId;
    } else if (field === 'listed_at' || field === 'shipped_at' || field === 'posted_at' || field === 'completed_at' || field === 'accepted_at') {
      const parsed = parseDate(value);
      if (parsed) record[field] = parsed;
    } else if (field === 'follower_count' || field === 'following_count') {
      record[field] = parseNum(value);
    } else if (field === 'product_price') {
      const price = parseNum(value);
      if (price > 0) record[field] = price;
    } else if (field === '_shipped' && isYes(value)) {
      record.status = 'shipped';
    } else if (field === '_acceptance' && isYes(value)) {
      record.status = 'accepted';
    } else if (field === '_dm_sent' && isYes(value)) {
      record.status = 'contacted';
    } else if (!field.startsWith('_')) {
      record[field] = String(value).trim();
    }
  }

  return record;
}

// 프로젝트 ID 조회 (스프레드시트 URL로)
async function getProjectBySheetUrl(spreadsheetId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('seeding_projects')
    .select('id')
    .or(`listup_sheet_url.ilike.%${spreadsheetId}%,listup_sheet_url.eq.${spreadsheetId}`)
    .limit(1)
    .single();

  if (error || !data) {
    console.log('[Webhook] Project not found for spreadsheet:', spreadsheetId);
    return null;
  }

  return data.id;
}

// ========== 핸들러 ==========
const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload: WebhookPayload = JSON.parse(event.body || '{}');
    console.log('[Webhook] Received:', payload.action, 'for sheet:', payload.sheetName);

    // Webhook secret 검증 (선택적)
    const webhookSecret = process.env.SHEETS_WEBHOOK_SECRET;
    if (webhookSecret && payload.secret !== webhookSecret) {
      console.log('[Webhook] Invalid secret');
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 프로젝트 ID 조회
    const projectId = await getProjectBySheetUrl(payload.spreadsheetId);
    if (!projectId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found for this spreadsheet' })
      };
    }

    let result: any = { success: true };

    switch (payload.action) {
      case 'edit':
      case 'insert': {
        // 단일 행 upsert
        if (!payload.rowData || payload.rowIndex === undefined) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing rowData or rowIndex' }) };
        }

        const record = rowToRecord(payload.rowData, projectId, payload.rowIndex);

        if (!record.account_id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cannot extract account_id from row' }) };
        }

        // sheet_row_index 기준으로 upsert
        const { data: existing } = await supabase
          .from('seeding_influencers')
          .select('id')
          .eq('project_id', projectId)
          .eq('sheet_row_index', payload.rowIndex)
          .single();

        if (existing) {
          // 업데이트
          const { error } = await supabase
            .from('seeding_influencers')
            .update(record)
            .eq('id', existing.id);

          if (error) throw error;
          result = { success: true, action: 'updated', rowIndex: payload.rowIndex };
        } else {
          // 삽입
          const { error } = await supabase
            .from('seeding_influencers')
            .insert(record);

          if (error) throw error;
          result = { success: true, action: 'inserted', rowIndex: payload.rowIndex };
        }

        console.log('[Webhook] Upserted row:', payload.rowIndex);
        break;
      }

      case 'delete': {
        // 행 삭제
        if (!payload.deletedRowIndexes || payload.deletedRowIndexes.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing deletedRowIndexes' }) };
        }

        const { error } = await supabase
          .from('seeding_influencers')
          .delete()
          .eq('project_id', projectId)
          .in('sheet_row_index', payload.deletedRowIndexes);

        if (error) throw error;
        result = { success: true, action: 'deleted', count: payload.deletedRowIndexes.length };
        console.log('[Webhook] Deleted rows:', payload.deletedRowIndexes);
        break;
      }

      case 'bulk_sync': {
        // 벌크 동기화 (전체 시트 동기화)
        if (!payload.rows || payload.rows.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing rows' }) };
        }

        const records = payload.rows
          .map(row => rowToRecord(row.data, projectId, row.rowIndex))
          .filter(r => r.account_id);

        // 기존 데이터 삭제
        await supabase
          .from('seeding_influencers')
          .delete()
          .eq('project_id', projectId);

        // 새 데이터 삽입
        if (records.length > 0) {
          const { error } = await supabase
            .from('seeding_influencers')
            .insert(records);

          if (error) throw error;
        }

        result = { success: true, action: 'bulk_synced', count: records.length };
        console.log('[Webhook] Bulk synced:', records.length, 'rows');
        break;
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${payload.action}` }) };
    }

    // 마지막 동기화 시간 업데이트
    await supabase
      .from('seeding_projects')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', projectId);

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

export { handler };
