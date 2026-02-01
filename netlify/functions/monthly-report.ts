import { schedule, Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 유틸 ==========

function getLastMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth(); // 0-indexed, so this is already "last month"

  const lastYear = month === 0 ? year - 1 : year;
  const lastMonth = month === 0 ? 12 : month;

  const start = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(lastYear, lastMonth, 0).getDate();
  const end = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = `${lastYear}년 ${lastMonth}월`;

  return { start, end, label };
}

function getPrevMonthRange(start: string): { start: string; end: string } {
  const [y, m] = start.split('-').map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;

  const pStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  const pEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start: pStart, end: pEnd };
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

function pctEmoji(current: number, previous: number): string {
  if (previous === 0) return '';
  const pct = ((current - previous) / previous) * 100;
  if (pct >= 10) return '📈';
  if (pct <= -10) return '📉';
  return '➡️';
}

// ========== 데이터 조회 ==========

interface MonthSales {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  byChannel: Record<string, { revenue: number; count: number }>;
  topProducts: { name: string; revenue: number; count: number }[];
  dailyRevenue: { date: string; revenue: number }[];
}

async function getMonthSales(startDate: string, endDate: string): Promise<MonthSales> {
  const { data, error } = await supabase
    .from('orders_raw')
    .select('paid_amount, channel, product_name, order_date, order_status')
    .gte('order_date', startDate)
    .lte('order_date', endDate)
    .not('order_status', 'in', '("cancelled","refunded","returned","exchanged")');

  if (error || !data) {
    return { totalRevenue: 0, orderCount: 0, avgOrderValue: 0, byChannel: {}, topProducts: [], dailyRevenue: [] };
  }

  let totalRevenue = 0;
  const byChannel: Record<string, { revenue: number; count: number }> = {};
  const productMap: Record<string, { revenue: number; count: number }> = {};
  const dailyMap: Record<string, number> = {};

  for (const row of data) {
    const amount = Number(row.paid_amount) || 0;
    const channel = (row.channel as string) || 'other';
    const productName = (row.product_name as string) || '기타';
    const orderDate = (row.order_date as string) || '';

    totalRevenue += amount;

    if (!byChannel[channel]) byChannel[channel] = { revenue: 0, count: 0 };
    byChannel[channel].revenue += amount;
    byChannel[channel].count += 1;

    if (!productMap[productName]) productMap[productName] = { revenue: 0, count: 0 };
    productMap[productName].revenue += amount;
    productMap[productName].count += 1;

    if (orderDate) {
      dailyMap[orderDate] = (dailyMap[orderDate] || 0) + amount;
    }
  }

  const topProducts = Object.entries(productMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const dailyRevenue = Object.entries(dailyMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevenue,
    orderCount: data.length,
    avgOrderValue: data.length > 0 ? Math.round(totalRevenue / data.length) : 0,
    byChannel,
    topProducts,
    dailyRevenue,
  };
}

interface SeedingMonthStats {
  totalListup: number;
  totalAccepted: number;
  totalShipped: number;
  totalCompleted: number;
  seedingCost: number;
}

async function getSeedingMonthStats(startDate: string, endDate: string): Promise<SeedingMonthStats> {
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

  // 발송 완료 상태 (시딩 마케팅비 계산 대상)
  const { data: shippedData } = await supabase
    .from('seeding_influencers')
    .select('product_price, quantity, payment, shipping_cost, fee, status')
    .in('status', ['shipped', 'guide_sent', 'posted', 'completed'])
    .gte('updated_at', startDate + 'T00:00:00')
    .lte('updated_at', endDate + 'T23:59:59');

  const shipped = shippedData || [];

  let seedingCost = 0;
  let shippedCount = 0;
  let completedCount = 0;

  for (const row of shipped) {
    const qty = Number(row.quantity) || 1;
    const price = Number(row.product_price) || 0;
    const pay = Number(row.payment) || Number(row.fee) || 0;
    const ship = Number(row.shipping_cost) || 0;
    seedingCost += (price * qty) + pay + ship;

    if (row.status === 'shipped' || row.status === 'guide_sent') shippedCount++;
    if (row.status === 'posted' || row.status === 'completed') completedCount++;
  }

  return {
    totalListup: listup?.length || 0,
    totalAccepted: accepted?.length || 0,
    totalShipped: shippedCount,
    totalCompleted: completedCount,
    seedingCost,
  };
}

// ========== 메시지 포맷 ==========

const CHANNEL_LABELS: Record<string, string> = {
  naver_smartstore: '스마트스토어',
  cafe24: '카페24',
  coupang: '쿠팡',
  other: '기타',
};

function formatMonthlyReport(
  thisMonth: MonthSales,
  lastMonth: MonthSales,
  seeding: SeedingMonthStats,
  monthLabel: string,
): string {
  const channelLines = Object.entries(thisMonth.byChannel)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([ch, stats]) => {
      const label = CHANNEL_LABELS[ch] || ch;
      const share = thisMonth.totalRevenue > 0
        ? ((stats.revenue / thisMonth.totalRevenue) * 100).toFixed(1)
        : '0';
      return `  - ${label}: ${formatKRW(stats.revenue)} (${share}%, ${stats.count}건)`;
    })
    .join('\n');

  const topProductLines = thisMonth.topProducts
    .map((p, i) => `  ${i + 1}. ${p.name}: ${formatKRW(p.revenue)} (${p.count}건)`)
    .join('\n');

  // 일 평균 매출
  const activeDays = thisMonth.dailyRevenue.length || 1;
  const dailyAvg = Math.round(thisMonth.totalRevenue / activeDays);

  // 최고/최저 매출일
  let bestDay = { date: '-', revenue: 0 };
  let worstDay = { date: '-', revenue: Infinity };
  for (const d of thisMonth.dailyRevenue) {
    if (d.revenue > bestDay.revenue) bestDay = d;
    if (d.revenue < worstDay.revenue) worstDay = d;
  }
  if (worstDay.revenue === Infinity) worstDay = { date: '-', revenue: 0 };

  const revenueEmoji = pctEmoji(thisMonth.totalRevenue, lastMonth.totalRevenue);

  return `📊 [월간 리포트] ${monthLabel}

${revenueEmoji} 매출 요약
- 총 매출: ${formatKRW(thisMonth.totalRevenue)} (${pctStr(thisMonth.totalRevenue, lastMonth.totalRevenue)} 전월 대비)
- 주문 건수: ${thisMonth.orderCount.toLocaleString()}건 (${pctStr(thisMonth.orderCount, lastMonth.orderCount)})
- 평균 객단가: ${formatKRW(thisMonth.avgOrderValue)}
- 일 평균 매출: ${formatKRW(dailyAvg)}

📊 채널별 매출
${channelLines || '  (데이터 없음)'}

🏆 TOP 5 상품
${topProductLines || '  (데이터 없음)'}

📅 매출 하이라이트
- 최고 매출일: ${bestDay.date} (${formatKRW(bestDay.revenue)})
- 최저 매출일: ${worstDay.date} (${formatKRW(worstDay.revenue)})

🌱 시딩 현황
- 리스트업: ${seeding.totalListup}명
- 수락: ${seeding.totalAccepted}명
- 발송: ${seeding.totalShipped}건
- 완료: ${seeding.totalCompleted}건
- 시딩 비용: ${formatKRW(seeding.seedingCost)}

💡 다음 달도 파이팅!`;
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
    console.log('[Monthly Report] Naver Works not configured, skipping');
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

const monthlyReportHandler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    console.log('[Monthly Report] Starting...');

    // 지난달 범위 계산
    const { start, end, label } = getLastMonthRange();
    const prev = getPrevMonthRange(start);

    console.log(`[Monthly Report] This month: ${start} ~ ${end} (${label})`);
    console.log(`[Monthly Report] Prev month: ${prev.start} ~ ${prev.end}`);

    const [thisMonth, lastMonth, seeding] = await Promise.all([
      getMonthSales(start, end),
      getMonthSales(prev.start, prev.end),
      getSeedingMonthStats(start, end),
    ]);

    const message = formatMonthlyReport(thisMonth, lastMonth, seeding, label);
    console.log('[Monthly Report] Message:', message);

    if (process.env.NAVER_WORKS_CLIENT_ID) {
      await sendNaverWorksMessage(message);
      console.log('[Monthly Report] Sent to Naver Works');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        period: { start, end, label },
        thisMonth,
        lastMonth,
        seeding,
      }),
    };
  } catch (error: any) {
    console.error('[Monthly Report] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 스케줄: 매월 1일 오전 10시 KST = UTC 01:00
export const handler = schedule('0 1 1 * *', monthlyReportHandler);

// 수동 테스트용
export { monthlyReportHandler as testHandler };
