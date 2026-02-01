import { schedule, Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 유틸 ==========

function getDaysAgoKST(days: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - days);
  return kst.toISOString().split('T')[0];
}

function formatKRW(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`;
  if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString()}만원`;
  return `${amount.toLocaleString()}원`;
}

function pctStr(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+∞' : '0%';
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

// ========== 데이터 조회 ==========

interface PeriodSales {
  totalRevenue: number;
  orderCount: number;
  byChannel: Record<string, { revenue: number; count: number }>;
  topProducts: { name: string; revenue: number; count: number }[];
}

async function getPeriodSales(startDate: string, endDate: string): Promise<PeriodSales> {
  const { data, error } = await supabase
    .from('orders_raw')
    .select('paid_amount, channel, product_name, order_status')
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .not('order_status', 'in', '("cancelled","refunded","returned","exchanged")');

  if (error || !data) {
    return { totalRevenue: 0, orderCount: 0, byChannel: {}, topProducts: [] };
  }

  let totalRevenue = 0;
  const byChannel: Record<string, { revenue: number; count: number }> = {};
  const productMap: Record<string, { revenue: number; count: number }> = {};

  for (const row of data) {
    const amount = Number(row.paid_amount) || 0;
    const channel = (row.channel as string) || 'other';
    const productName = (row.product_name as string) || '기타';

    totalRevenue += amount;

    if (!byChannel[channel]) byChannel[channel] = { revenue: 0, count: 0 };
    byChannel[channel].revenue += amount;
    byChannel[channel].count += 1;

    if (!productMap[productName]) productMap[productName] = { revenue: 0, count: 0 };
    productMap[productName].revenue += amount;
    productMap[productName].count += 1;
  }

  const topProducts = Object.entries(productMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    totalRevenue,
    orderCount: data.length,
    byChannel,
    topProducts,
  };
}

interface SeedingWeeklyStats {
  newListup: number;
  newAccepted: number;
  newShipped: number;
  newCompleted: number;
}

async function getSeedingStats(startDate: string, endDate: string): Promise<SeedingWeeklyStats> {
  const { data: listup } = await supabase
    .from('seeding_influencers')
    .select('id')
    .gte('listed_at', startDate)
    .lte('listed_at', endDate);

  const { data: accepted } = await supabase
    .from('seeding_influencers')
    .select('id')
    .gte('accepted_at', startDate)
    .lte('accepted_at', endDate);

  const { data: shipped } = await supabase
    .from('seeding_influencers')
    .select('id')
    .eq('status', 'shipped')
    .gte('updated_at', startDate + 'T00:00:00')
    .lte('updated_at', endDate + 'T23:59:59');

  const { data: completed } = await supabase
    .from('seeding_influencers')
    .select('id')
    .eq('status', 'completed')
    .gte('updated_at', startDate + 'T00:00:00')
    .lte('updated_at', endDate + 'T23:59:59');

  return {
    newListup: listup?.length || 0,
    newAccepted: accepted?.length || 0,
    newShipped: shipped?.length || 0,
    newCompleted: completed?.length || 0,
  };
}

// ========== 메시지 포맷 ==========

const CHANNEL_LABELS: Record<string, string> = {
  naver_smartstore: '스마트스토어',
  cafe24: '카페24',
  coupang: '쿠팡',
  other: '기타',
};

function formatWeeklyReport(
  thisWeek: PeriodSales,
  lastWeek: PeriodSales,
  seeding: SeedingWeeklyStats,
  weekStart: string,
  weekEnd: string,
): string {
  const channelLines = Object.entries(thisWeek.byChannel)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([ch, stats]) => {
      const label = CHANNEL_LABELS[ch] || ch;
      return `  - ${label}: ${formatKRW(stats.revenue)} (${stats.count}건)`;
    })
    .join('\n');

  const topProductLines = thisWeek.topProducts
    .slice(0, 3)
    .map((p, i) => `  ${i + 1}. ${p.name}: ${formatKRW(p.revenue)} (${p.count}건)`)
    .join('\n');

  return `📋 [주간 리포트] ${weekStart} ~ ${weekEnd}

💰 매출 현황
- 총 매출: ${formatKRW(thisWeek.totalRevenue)} (${pctStr(thisWeek.totalRevenue, lastWeek.totalRevenue)} 전주 대비)
- 주문 건수: ${thisWeek.orderCount.toLocaleString()}건 (${pctStr(thisWeek.orderCount, lastWeek.orderCount)})

📊 채널별 매출
${channelLines || '  (데이터 없음)'}

🏆 TOP 상품
${topProductLines || '  (데이터 없음)'}

🌱 시딩 현황 (금주)
- 리스트업: ${seeding.newListup}명
- 수락: ${seeding.newAccepted}명
- 발송: ${seeding.newShipped}명
- 완료: ${seeding.newCompleted}명

📈 전주 대비: 매출 ${pctStr(thisWeek.totalRevenue, lastWeek.totalRevenue)} | 주문 ${pctStr(thisWeek.orderCount, lastWeek.orderCount)}`;
}

// ========== 네이버웍스 전송 ==========

function createJWT(clientId: string, serviceAccountId: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: clientId, sub: serviceAccountId, iat: now, exp: now + 3600 };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

async function getAccessToken(
  clientId: string, clientSecret: string, serviceAccountId: string, privateKey: string
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

async function sendNaverWorksMessage(message: string): Promise<void> {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
  let privateKey = process.env.NAVER_WORKS_PRIVATE_KEY;

  if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !channelId) {
    console.log('[Weekly Report] Naver Works not configured, skipping');
    return;
  }

  if (!privateKey.includes('-----BEGIN')) {
    try { privateKey = Buffer.from(privateKey, 'base64').toString('utf-8'); } catch { /* ignore */ }
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const accessToken = await getAccessToken(clientId, clientSecret, serviceAccountId, privateKey);

  const response = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { type: 'text', text: message } }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Message send failed: ${response.status} - ${errorText}`);
  }
}

// ========== 메인 핸들러 ==========

const weeklyReportHandler: Handler = async (_event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    console.log('[Weekly Report] Starting...');

    // 이번 주 범위 (월~일)
    const weekEnd = getDaysAgoKST(1); // 어제 (일요일)
    const weekStart = getDaysAgoKST(7); // 지난 월요일

    // 지난 주 범위
    const lastWeekEnd = getDaysAgoKST(8);
    const lastWeekStart = getDaysAgoKST(14);

    console.log(`[Weekly Report] This week: ${weekStart} ~ ${weekEnd}`);
    console.log(`[Weekly Report] Last week: ${lastWeekStart} ~ ${lastWeekEnd}`);

    const [thisWeek, lastWeek, seeding] = await Promise.all([
      getPeriodSales(weekStart, weekEnd),
      getPeriodSales(lastWeekStart, lastWeekEnd),
      getSeedingStats(weekStart, weekEnd),
    ]);

    const message = formatWeeklyReport(thisWeek, lastWeek, seeding, weekStart, weekEnd);
    console.log('[Weekly Report] Message:', message);

    if (process.env.NAVER_WORKS_CLIENT_ID) {
      await sendNaverWorksMessage(message);
      console.log('[Weekly Report] Sent to Naver Works');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        period: { weekStart, weekEnd },
        thisWeek,
        lastWeek,
        seeding,
      }),
    };
  } catch (error: any) {
    console.error('[Weekly Report] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 스케줄: 매주 월요일 오전 9시 KST = UTC 00:00 Monday
export const handler = schedule('0 0 * * 1', weeklyReportHandler);

// 수동 테스트용
export { weeklyReportHandler as testHandler };
