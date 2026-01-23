import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { google, sheets_v4 } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// ========== Supabase 클라이언트 ==========
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
function extractSpreadsheetId(input: string): string {
  if (!input.includes('/')) {
    return input;
  }
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

// ========== 동기화 로직 ==========
async function syncProject(project: any): Promise<{ success: boolean; message: string }> {
  const logs: string[] = [];
  let hasError = false;

  try {
    // 리스트업 시트 동기화
    if (project.listup_sheet_url) {
      try {
        const response = await fetch(`${process.env.URL}/.netlify/functions/google-sheets-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            spreadsheetId: extractSpreadsheetId(project.listup_sheet_url),
            sheetName: project.listup_sheet_name || 'Sheet1',
            projectId: project.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          logs.push(`리스트업: ${result.added}건 추가`);
        } else {
          logs.push('리스트업 동기화 실패');
          hasError = true;
        }
      } catch (err: any) {
        logs.push(`리스트업 오류: ${err.message}`);
        hasError = true;
      }
    }

    // 설문 응답 시트 동기화
    if (project.survey_sheet_url) {
      try {
        const response = await fetch(`${process.env.URL}/.netlify/functions/google-sheets-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync-survey',
            spreadsheetId: extractSpreadsheetId(project.survey_sheet_url),
            sheetName: project.survey_sheet_name || 'Form Responses 1',
            projectId: project.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          logs.push(`설문응답: ${result.updated}건 업데이트`);
        } else {
          logs.push('설문응답 동기화 실패');
          hasError = true;
        }
      } catch (err: any) {
        logs.push(`설문응답 오류: ${err.message}`);
        hasError = true;
      }
    }

    // 마지막 동기화 시간 업데이트
    await supabase
      .from('seeding_projects')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', project.id);

    return {
      success: !hasError,
      message: `[${project.name}] ${logs.join(', ')}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `[${project.name}] 오류: ${err.message}`,
    };
  }
}

// ========== Handler ==========
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    console.log('Starting scheduled sync...');

    // 자동 동기화가 활성화된 프로젝트 조회
    const { data: projects, error } = await supabase
      .from('seeding_projects')
      .select('*')
      .eq('auto_sync_enabled', true)
      .in('status', ['planning', 'active']); // 진행중인 프로젝트만

    if (error) {
      throw new Error(`프로젝트 조회 실패: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '자동 동기화가 설정된 프로젝트가 없습니다.',
          synced: 0,
        }),
      };
    }

    console.log(`Found ${projects.length} projects to sync`);

    // 각 프로젝트 동기화
    const results: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const project of projects) {
      const result = await syncProject(project);
      results.push(result.message);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`Sync completed: ${successCount} success, ${failCount} failed`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `동기화 완료: ${successCount}개 성공, ${failCount}개 실패`,
        synced: successCount,
        failed: failCount,
        details: results,
      }),
    };
  } catch (error: any) {
    console.error('Scheduled sync error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
    };
  }
};

// Netlify Scheduled Function 설정
// 매일 오전 9시 (KST = UTC+9, so 0:00 UTC)
export const config = {
  schedule: '0 0 * * *', // UTC 00:00 = KST 09:00
};

export { handler };
