import { schedule, Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 타입 ==========
interface BrandStats {
  listup: { actual: number; target: number };
  acceptance: { actual: number; target: number };
}

type AlertType = 'warning' | 'critical';
type Brand = 'howpapa' | 'nuccio';

// ========== KPI 목표 ==========
const KPI_TARGETS = {
  howpapa: { listup: 100, acceptance: 15 },
  nuccio: { listup: 100, acceptance: 15 },
};

// ========== 브랜드별 채널 ID ==========
const BRAND_CHANNEL_IDS: Record<Brand, string> = {
  howpapa: 'bd36a0be-28d2-0afe-d42e-293607b966cb',
  nuccio: '7ba5ac6c-73fd-a63d-afc1-8950ce03b601',
};

// ========== 유틸 함수 ==========

// 상태 이모지 결정
function getStatusEmoji(percentage: number, threshold: number): string {
  if (percentage >= threshold * 100) return '✅';
  if (percentage >= 50) return '⚠️';
  return '🔴';
}

// 날짜 포맷 (한국어)
function formatKoreanDateTime(date: Date): string {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kstDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hour = kstDate.getUTCHours();
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${dateStr} ${period} ${hour12}시`;
}

// 오늘 날짜 (KST 기준)
function getTodayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  return kst.toISOString().split('T')[0];
}

// ========== 데이터 조회 ==========

async function getBrandStats(brand: Brand): Promise<BrandStats> {
  const today = getTodayKST();

  // 브랜드별 프로젝트 조회
  const { data: projects } = await supabase
    .from('seeding_projects')
    .select('id')
    .eq('brand', brand);

  const projectIds = (projects || []).map((p) => p.id);

  if (projectIds.length === 0) {
    return {
      listup: { actual: 0, target: KPI_TARGETS[brand].listup },
      acceptance: { actual: 0, target: KPI_TARGETS[brand].acceptance },
    };
  }

  // 오늘의 인플루언서 데이터 조회
  const { data: influencers } = await supabase
    .from('seeding_influencers')
    .select('listed_at, accepted_at, status')
    .in('project_id', projectIds);

  const allInfluencers = influencers || [];

  // 리스트업: listed_at이 오늘인 것
  const listupCount = allInfluencers.filter((inf) =>
    inf.listed_at?.startsWith(today)
  ).length;

  // 수락: accepted_at이 오늘인 것
  const acceptedCount = allInfluencers.filter((inf) =>
    inf.accepted_at?.startsWith(today)
  ).length;

  return {
    listup: { actual: listupCount, target: KPI_TARGETS[brand].listup },
    acceptance: { actual: acceptedCount, target: KPI_TARGETS[brand].acceptance },
  };
}

// ========== 메시지 포맷 ==========

function formatAlertMessage(
  alertType: AlertType,
  brand: Brand,
  stats: BrandStats,
  threshold: number
): string {
  const brandName = brand.toUpperCase();
  const dateTimeStr = formatKoreanDateTime(new Date());

  const listupPct = Math.round((stats.listup.actual / stats.listup.target) * 100);
  const acceptPct = Math.round((stats.acceptance.actual / stats.acceptance.target) * 100);

  const listupEmoji = getStatusEmoji(listupPct, threshold);
  const acceptEmoji = getStatusEmoji(acceptPct, threshold);

  if (alertType === 'warning') {
    // 한국어 + 베트남어
    return `⚠️ [${brandName}] 시딩 진행률 주의
⚠️ [${brandName}] Cảnh báo tiến độ seeding

📅 ${dateTimeStr} 기준 / Tính đến

📊 현재 현황 / Tình hình hiện tại
- 리스트업/List-up: ${stats.listup.actual}/${stats.listup.target} (${listupPct}%) ${listupEmoji}
- 수락/Chấp nhận: ${stats.acceptance.actual}/${stats.acceptance.target} (${acceptPct}%) ${acceptEmoji}

💡 남은 시간 내 달성을 위해 속도를 높여주세요.
💡 Hãy tăng tốc để đạt mục tiêu trong thời gian còn lại.`;
  } else {
    return `🔴 [${brandName}] 시딩 목표 미달 경고
🔴 [${brandName}] Cảnh báo không đạt mục tiêu seeding

📅 ${dateTimeStr} 기준 / Tính đến

📊 현재 현황 / Tình hình hiện tại
- 리스트업/List-up: ${stats.listup.actual}/${stats.listup.target} (${listupPct}%) ${listupEmoji}
- 수락/Chấp nhận: ${stats.acceptance.actual}/${stats.acceptance.target} (${acceptPct}%) ${acceptEmoji}

⚠️ 오늘 목표 달성이 어려울 수 있습니다.
⚠️ Có thể khó đạt được mục tiêu hôm nay.`;
  }
}

// ========== 네이버웍스 전송 ==========

// JWT 생성
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

// Access Token 발급
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

// 메시지 전송 (브랜드별 채널 지원)
async function sendNaverWorksMessage(message: string, channelId?: string): Promise<void> {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const targetChannelId = channelId || process.env.NAVER_WORKS_CHANNEL_ID;
  let privateKey = process.env.NAVER_WORKS_PRIVATE_KEY;

  if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !targetChannelId) {
    throw new Error('Missing Naver Works configuration');
  }

  // Private Key 처리
  if (!privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch (e) {
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

const alertHandler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // 테스트 모드 확인
    const isTest = event.queryStringParameters?.test === 'true';
    const forceAlertType = event.queryStringParameters?.type as AlertType | undefined;

    // 현재 UTC 시간 확인
    const utcHour = new Date().getUTCHours();

    // 알림 타입 결정: UTC 06:00 = KST 15:00 (warning), UTC 09:00 = KST 18:00 (critical)
    let alertType: AlertType;
    let threshold: number;

    if (forceAlertType) {
      alertType = forceAlertType;
      threshold = alertType === 'warning' ? 0.5 : 0.7;
    } else if (utcHour === 6) {
      alertType = 'warning';
      threshold = 0.5; // 50%
    } else if (utcHour === 9) {
      alertType = 'critical';
      threshold = 0.7; // 70%
    } else {
      // 스케줄 시간이 아닌 경우 (수동 테스트)
      alertType = 'warning';
      threshold = 0.5;
    }

    console.log(`[KPI Alert] Starting... (type: ${alertType}, threshold: ${threshold * 100}%, test: ${isTest})`);

    const brands: Brand[] = ['howpapa', 'nuccio'];
    const results: any[] = [];
    const alertsSent: string[] = [];

    for (const brand of brands) {
      const stats = await getBrandStats(brand);

      const listupRate = stats.listup.actual / stats.listup.target;
      const acceptRate = stats.acceptance.actual / stats.acceptance.target;

      console.log(`[KPI Alert] ${brand}: listup=${listupRate.toFixed(2)}, accept=${acceptRate.toFixed(2)}, threshold=${threshold}`);

      results.push({
        brand,
        stats,
        listupRate,
        acceptRate,
        needsAlert: listupRate < threshold || acceptRate < threshold,
      });

      // 목표 미달 시에만 알림
      if (listupRate < threshold || acceptRate < threshold) {
        const message = formatAlertMessage(alertType, brand, stats, threshold);
        const brandChannelId = BRAND_CHANNEL_IDS[brand];

        if (process.env.NAVER_WORKS_CLIENT_ID) {
          await sendNaverWorksMessage(message, brandChannelId);
          alertsSent.push(brand);
          console.log(`[KPI Alert] Alert sent for ${brand} to channel ${brandChannelId}`);
        } else {
          console.log(`[KPI Alert] Would send alert for ${brand}:`, message);
        }
      } else {
        console.log(`[KPI Alert] ${brand} is on track, no alert needed`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        alertType,
        threshold: `${threshold * 100}%`,
        results,
        alertsSent,
        message: alertsSent.length > 0
          ? `Alerts sent for: ${alertsSent.join(', ')}`
          : 'All brands on track, no alerts sent',
      }),
    };
  } catch (error: any) {
    console.error('[KPI Alert] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 스케줄 핸들러: 15:00, 18:00 KST = UTC 06:00, 09:00
export const handler = schedule('0 6,9 * * *', alertHandler);

// 수동 테스트용 엔드포인트
export { alertHandler as testHandler };
