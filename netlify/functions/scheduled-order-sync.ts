/**
 * 스케줄 주문 동기화 Netlify Function
 *
 * 매 시간 자동으로 전 채널 (스마트스토어, Cafe24, 쿠팡) 주문을 동기화합니다.
 * 각 채널의 활성 자격증명을 조회하여 최근 3일간 주문을 가져옵니다.
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FUNCTION_URL = process.env.URL ? `${process.env.URL}/.netlify/functions/commerce-proxy` : '';
const SYNC_DAYS = 3; // 최근 3일간 동기화

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface SyncChannelResult {
  channel: string;
  brandId?: string;
  success: boolean;
  message: string;
  synced?: number;
}

async function syncChannel(channel: string, brandId?: string): Promise<SyncChannelResult> {
  try {
    if (!FUNCTION_URL) {
      return { channel, brandId, success: false, message: 'URL 환경변수가 설정되지 않았습니다.' };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - SYNC_DAYS);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync-orders',
        channel,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        brandId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { channel, brandId, success: false, message: `HTTP ${response.status}: ${text.substring(0, 200)}` };
    }

    const result = await response.json();
    if (result.success) {
      return { channel, brandId, success: true, message: result.message || '동기화 완료', synced: result.synced || 0 };
    } else {
      return { channel, brandId, success: false, message: result.error || result.message || '동기화 실패' };
    }
  } catch (error: any) {
    return { channel, brandId, success: false, message: `오류: ${error.message}` };
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    console.log('[scheduled-order-sync] Starting...');

    // 활성 자격증명 조회 (채널별로 그룹핑)
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('channel, brand_id, is_active')
      .eq('is_active', true)
      .in('channel', ['naver_smartstore', 'cafe24', 'coupang']);

    if (credError) {
      throw new Error(`자격증명 조회 실패: ${credError.message}`);
    }

    if (!credentials || credentials.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '활성 자격증명이 없습니다.', synced: 0 }),
      };
    }

    console.log(`[scheduled-order-sync] Found ${credentials.length} active credentials`);

    // 채널별 동기화 실행
    const results: SyncChannelResult[] = [];
    let totalSynced = 0;

    for (const cred of credentials) {
      // channel 매핑: naver_smartstore → smartstore
      const channelParam = cred.channel === 'naver_smartstore' ? 'smartstore' : cred.channel;
      const result = await syncChannel(channelParam, cred.brand_id || undefined);
      results.push(result);
      if (result.success && result.synced) totalSynced += result.synced;

      console.log(`[scheduled-order-sync] ${cred.channel} (brand: ${cred.brand_id || 'default'}): ${result.success ? 'OK' : 'FAIL'} - ${result.message}`);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // 동기화 로그 기록
    try {
      await supabase.from('api_sync_logs').insert({
        action: 'scheduled-order-sync',
        status: failCount === 0 ? 'success' : 'partial',
        message: `${successCount}개 성공, ${failCount}개 실패, ${totalSynced}건 동기화`,
        details: results,
        created_at: new Date().toISOString(),
      });
    } catch {
      // 로그 실패는 무시
    }

    console.log(`[scheduled-order-sync] Done: ${successCount} success, ${failCount} failed, ${totalSynced} synced`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${successCount}개 채널 동기화 완료, ${totalSynced}건`,
        results,
      }),
    };
  } catch (error: any) {
    console.error('[scheduled-order-sync] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

// 매 시간 실행 (KST 기준으로 매시 정각)
export const config = {
  schedule: '0 * * * *',
};

export { handler };
