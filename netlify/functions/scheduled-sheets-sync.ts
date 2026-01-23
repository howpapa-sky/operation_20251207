import { Handler, schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets API 설정
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');

// 컬럼 매핑 (google-sheets-sync.ts와 동일)
const columnMapping: Record<string, string> = {
  // 계정 정보
  '계정': 'account_id',
  '계정ID': 'account_id',
  'account': 'account_id',
  'Account': 'account_id',
  'account_id': 'account_id',
  '인플루언서': 'account_id',

  // 팔로워
  '팔로워': 'follower_count',
  '팔로워수': 'follower_count',
  'follower': 'follower_count',
  'Follower': 'follower_count',
  'followers': 'follower_count',
  'Followers': 'follower_count',

  // 팔로잉
  'Following': 'following_count',
  'following': 'following_count',
  '팔로잉': 'following_count',

  // 이메일
  '이메일': 'email',
  'email': 'email',
  'Email': 'email',
  'E-mail': 'email',

  // URL
  'URL': 'profile_url',
  'url': 'profile_url',
  'URL(youtube, instagram)': 'profile_url',

  // 날짜
  'date': 'listed_at',
  'Date': 'listed_at',
  '날짜': 'listed_at',
  '등록일': 'listed_at',

  // 제품
  '제품명': 'product_name',
  '제품': 'product_name',
  'product': 'product_name',
  'Product': 'product_name',

  // 가격
  '가격': 'product_price',
  'price': 'product_price',
  'Price': 'product_price',
  'Cost': 'product_price',
  'cost': 'product_price',

  // 메모
  'NOTE': 'notes',
  'note': 'notes',
  'Notes': 'notes',
  '메모': 'notes',
  '비고': 'notes',
};

// 날짜 파싱
function parseDateToISO(value: string): string | undefined {
  if (!value) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }

  // YYYY.MM.DD or YYYY/MM/DD
  const yyyymmddMatch = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mmddyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 한글 형식: 12월4일
  const CURRENT_YEAR = new Date().getFullYear();
  const koreanMatch = str.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
  if (koreanMatch) {
    const [, month, day] = koreanMatch;
    return `${CURRENT_YEAR}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }

  return undefined;
}

// 숫자 파싱 (K/M 단위 지원)
function parseNumber(value: any): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str) return 0;

  // K 단위
  const kMatch = str.match(/^([\d,.]+)\s*k$/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // M 단위
  const mMatch = str.match(/^([\d,.]+)\s*m$/i);
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  const num = parseInt(str.replace(/[,\s]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

// Google Sheets URL에서 ID 추출
function extractSpreadsheetId(url: string): string {
  if (!url.includes('/')) return url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
}

// 프로젝트 자동 동기화 실행
async function syncProject(project: any) {
  console.log(`[Auto-Sync] Starting sync for project: ${project.name} (${project.id})`);

  const spreadsheetId = extractSpreadsheetId(project.listup_sheet_url);
  const sheetName = project.listup_sheet_name || 'Sheet1';

  // Google Sheets API 인증
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 시트 데이터 가져오기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1000`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    console.log(`[Auto-Sync] No data found in sheet for project: ${project.name}`);
    return { success: true, added: 0 };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // 헤더 매핑
  const headerMap: Record<number, string> = {};
  headers.forEach((header: string, index: number) => {
    const normalized = header?.toString().trim();
    if (columnMapping[normalized]) {
      headerMap[index] = columnMapping[normalized];
    }
  });

  // 데이터 변환
  const records = dataRows.map((row: any[]) => {
    const record: Record<string, any> = {
      project_id: project.id,
      platform: 'instagram',
      seeding_type: 'free',
      content_type: 'story',
      status: 'listed',
    };

    row.forEach((cell, index) => {
      const field = headerMap[index];
      if (field && cell !== undefined && cell !== null && cell !== '') {
        let value: any = cell;

        // 필드별 변환
        if (field === 'listed_at' || field === 'posted_at') {
          value = parseDateToISO(cell);
        } else if (field === 'follower_count' || field === 'following_count') {
          value = parseNumber(cell);
        } else if (field === 'product_price' || field === 'fee') {
          const num = parseNumber(cell);
          value = num > 0 ? num : null;
        } else if (field === 'profile_url') {
          value = String(cell).trim();
          // account_id 추출
          const match = value.match(/@([a-zA-Z0-9._]+)/);
          if (match) {
            record.account_id = match[1];
          } else {
            const urlMatch = value.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (urlMatch) {
              record.account_id = urlMatch[1];
            }
          }
        }

        record[field] = value;
      }
    });

    // account_id 기본값
    if (!record.account_id) {
      record.account_id = `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    return record;
  }).filter((r: any) => r.account_id);

  if (records.length === 0) {
    console.log(`[Auto-Sync] No valid records for project: ${project.name}`);
    return { success: true, added: 0 };
  }

  // 기존 데이터 삭제
  await supabase
    .from('seeding_influencers')
    .delete()
    .eq('project_id', project.id);

  // 새 데이터 삽입
  const { error } = await supabase
    .from('seeding_influencers')
    .insert(records);

  if (error) {
    console.error(`[Auto-Sync] Insert error for project ${project.name}:`, error);
    throw error;
  }

  // 마지막 동기화 시간 업데이트
  await supabase
    .from('seeding_projects')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', project.id);

  console.log(`[Auto-Sync] Completed sync for project: ${project.name}, added: ${records.length}`);
  return { success: true, added: records.length };
}

// 메인 핸들러
const handler: Handler = async (event, context) => {
  console.log('[Scheduled Sheets Sync] Starting auto-sync job at', new Date().toISOString());

  try {
    // auto_sync_enabled가 true인 프로젝트 조회
    const { data: projects, error } = await supabase
      .from('seeding_projects')
      .select('*')
      .eq('auto_sync_enabled', true)
      .not('listup_sheet_url', 'is', null);

    if (error) {
      console.error('[Scheduled Sheets Sync] Error fetching projects:', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    if (!projects || projects.length === 0) {
      console.log('[Scheduled Sheets Sync] No projects with auto-sync enabled');
      return { statusCode: 200, body: JSON.stringify({ message: 'No projects to sync' }) };
    }

    console.log(`[Scheduled Sheets Sync] Found ${projects.length} projects with auto-sync enabled`);

    const results = [];
    for (const project of projects) {
      try {
        const result = await syncProject(project);
        results.push({ projectId: project.id, projectName: project.name, ...result });
      } catch (err: any) {
        console.error(`[Scheduled Sheets Sync] Error syncing project ${project.name}:`, err);
        results.push({ projectId: project.id, projectName: project.name, success: false, error: err.message });
      }
    }

    console.log('[Scheduled Sheets Sync] Completed auto-sync job');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results }),
    };
  } catch (err: any) {
    console.error('[Scheduled Sheets Sync] Unexpected error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// 매일 오전 9시 KST (0시 UTC) 실행
// Cron: 분 시 일 월 요일
// KST 09:00 = UTC 00:00
export const scheduledHandler = schedule('0 0 * * *', handler);

export { handler };
