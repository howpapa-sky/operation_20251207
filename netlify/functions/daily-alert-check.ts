import { schedule, Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 유틸 ==========

// KST 기준 오늘 날짜 (YYYY-MM-DD)
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

// KST 기준 어제 날짜
function getYesterdayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  return kst.toISOString().split('T')[0];
}

// N일 전 날짜
function getDaysAgoKST(days: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - days);
  return kst.toISOString().split('T')[0];
}

// 금액 포맷
function formatKRW(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

// ========== 데이터 조회 ==========

// 기간별 매출 합계 (orders_raw)
async function getRevenue(startDate: string, endDate: string): Promise<number> {
  const { data, error } = await supabase
    .from('orders_raw')
    .select('paid_amount')
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .not('order_status', 'in', '("cancelled","refunded","returned","exchanged")');

  if (error || !data) return 0;
  return data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.paid_amount) || 0), 0);
}

// 전일 vs 전전일 매출 비교
async function checkSalesDrop(threshold: number): Promise<{
  dropped: boolean;
  yesterdayRevenue: number;
  prevRevenue: number;
  dropPercent: number;
} | null> {
  const yesterday = getYesterdayKST();
  const dayBefore = getDaysAgoKST(2);

  const yesterdayRevenue = await getRevenue(yesterday, yesterday);
  const prevRevenue = await getRevenue(dayBefore, dayBefore);

  // 전전일 매출이 0이면 비교 불가
  if (prevRevenue === 0) return null;

  const dropPercent = ((prevRevenue - yesterdayRevenue) / prevRevenue) * 100;

  return {
    dropped: dropPercent >= threshold,
    yesterdayRevenue,
    prevRevenue,
    dropPercent,
  };
}

// 최근 7일 매출 추이 (주간 대비)
async function getWeeklyComparison(): Promise<{
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
}> {
  const today = getTodayKST();
  const weekAgo = getDaysAgoKST(7);
  const twoWeeksAgo = getDaysAgoKST(14);

  const thisWeek = await getRevenue(weekAgo, today);
  const lastWeek = await getRevenue(twoWeeksAgo, weekAgo);

  const changePercent = lastWeek > 0
    ? ((thisWeek - lastWeek) / lastWeek) * 100
    : 0;

  return { thisWeek, lastWeek, changePercent };
}

// ========== 알림 메시지 ==========

function buildAlertMessage(alerts: string[]): string {
  const today = getTodayKST();
  const header = `\u{1F6A8} [매출 이상 알림] ${today}`;
  const body = alerts.join('\n\n');
  const footer = '\n\n---\n설정: 환경설정 > 알림 설정에서 변경 가능';

  return `${header}\n\n${body}${footer}`;
}

// ========== 네이버웍스 전송 ==========

function createJWT(clientId: string, serviceAccountId: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccountId,
    iat: now,
    exp: now + 3600,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  serviceAccountId: string,
  privateKey: string
): Promise<string> {
  const jwt = createJWT(clientId, serviceAccountId, privateKey);

  const params = new URLSearchParams();
  params.append('assertion', jwt);
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'bot bot.message');

  const response = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendNaverWorksMessage(message: string, channelId?: string): Promise<void> {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const targetChannelId = channelId || process.env.NAVER_WORKS_CHANNEL_ID;
  let privateKey = process.env.NAVER_WORKS_PRIVATE_KEY;

  if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !targetChannelId) {
    console.log('[Alert] Naver Works not configured, skipping notification');
    return;
  }

  if (!privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch {
      // Base64 디코딩 실패 시 그대로 사용
    }
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const accessToken = await getAccessToken(clientId, clientSecret, serviceAccountId, privateKey);

  const response = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${targetChannelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { type: 'text', text: message },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Message send failed: ${response.status} - ${errorText}`);
  }
}

// ========== 메인 핸들러 ==========

const alertCheckHandler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    console.log('[Daily Alert] Starting alert check...');

    // 모든 사용자의 alert_settings 조회 (is_enabled = true)
    const { data: allSettings, error: settingsError } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('is_enabled', true);

    if (settingsError) {
      console.log('[Daily Alert] alert_settings table may not exist yet:', settingsError.message);
      // 테이블이 없어도 기본 임계값으로 체크
    }

    // 기본 임계값 (설정이 없는 경우)
    const defaultThreshold = 30;

    // 가장 낮은 (=가장 민감한) 임계값 사용
    const threshold = allSettings && allSettings.length > 0
      ? Math.min(...allSettings.map((s: Record<string, unknown>) => Number(s.sales_drop_threshold) || defaultThreshold))
      : defaultThreshold;

    const alerts: string[] = [];

    // 1. 매출 하락 체크
    const salesCheck = await checkSalesDrop(threshold);
    if (salesCheck) {
      if (salesCheck.dropped) {
        alerts.push(
          `\u{1F4C9} 매출 하락 감지!\n` +
          `어제 매출: ${formatKRW(salesCheck.yesterdayRevenue)}\n` +
          `전일 매출: ${formatKRW(salesCheck.prevRevenue)}\n` +
          `하락률: ${salesCheck.dropPercent.toFixed(1)}% (임계값: ${threshold}%)`
        );
      }
      console.log(`[Daily Alert] Sales check: yesterday=${salesCheck.yesterdayRevenue}, prev=${salesCheck.prevRevenue}, drop=${salesCheck.dropPercent.toFixed(1)}%`);
    }

    // 2. 주간 추이 체크
    const weeklyCheck = await getWeeklyComparison();
    if (weeklyCheck.changePercent < -20) {
      alerts.push(
        `\u{1F4CA} 주간 매출 감소 추이\n` +
        `이번 주: ${formatKRW(weeklyCheck.thisWeek)}\n` +
        `지난 주: ${formatKRW(weeklyCheck.lastWeek)}\n` +
        `변화: ${weeklyCheck.changePercent.toFixed(1)}%`
      );
    }
    console.log(`[Daily Alert] Weekly: this=${weeklyCheck.thisWeek}, last=${weeklyCheck.lastWeek}, change=${weeklyCheck.changePercent.toFixed(1)}%`);

    // 알림 전송
    if (alerts.length > 0) {
      const message = buildAlertMessage(alerts);
      console.log('[Daily Alert] Sending alert:', message);

      // 네이버웍스 알림 전송
      const shouldSendNaverWorks = !allSettings || allSettings.length === 0 ||
        allSettings.some((s: Record<string, unknown>) => s.notification_naver_works === true);

      if (shouldSendNaverWorks && process.env.NAVER_WORKS_CLIENT_ID) {
        await sendNaverWorksMessage(message);
        console.log('[Daily Alert] Naver Works message sent');
      }
    } else {
      console.log('[Daily Alert] No alerts to send - all metrics normal');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        alertCount: alerts.length,
        salesCheck,
        weeklyCheck,
        threshold,
        message: alerts.length > 0
          ? `${alerts.length} alert(s) sent`
          : 'All metrics normal, no alerts',
      }),
    };
  } catch (error: any) {
    console.error('[Daily Alert] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 스케줄: 매일 오전 9시 KST = UTC 00:00
export const handler = schedule('0 0 * * *', alertCheckHandler);

// 수동 테스트용
export { alertCheckHandler as testHandler };
