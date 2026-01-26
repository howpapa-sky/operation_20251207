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

interface DailyStats {
  howpapa: BrandStats;
  nuccio: BrandStats;
}

// ========== KPI 목표 ==========
const KPI_TARGETS = {
  howpapa: { listup: 100, acceptance: 15 },
  nuccio: { listup: 100, acceptance: 15 },
};

// ========== 유틸 함수 ==========

// 상태 이모지 결정
function getStatusEmoji(percentage: number): string {
  if (percentage >= 80) return '✅';
  if (percentage >= 50) return '⚠️';
  return '🔴';
}

// 날짜 포맷 (한국어)
function formatKoreanDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 오늘 날짜 (KST 기준)
function getTodayKST(): string {
  const now = new Date();
  // UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  return kst.toISOString().split('T')[0];
}

// ========== 데이터 조회 ==========

async function getTodayStats(): Promise<DailyStats> {
  const today = getTodayKST();

  // 브랜드별 프로젝트 조회
  const { data: projects } = await supabase
    .from('seeding_projects')
    .select('id, brand');

  const howpapaProjectIds = (projects || [])
    .filter((p) => p.brand === 'howpapa')
    .map((p) => p.id);
  const nuccioProjectIds = (projects || [])
    .filter((p) => p.brand === 'nuccio')
    .map((p) => p.id);

  // 오늘의 인플루언서 데이터 조회
  const { data: influencers } = await supabase
    .from('seeding_influencers')
    .select('project_id, listed_at, accepted_at, status');

  const allInfluencers = influencers || [];

  // 수락 상태 목록
  const acceptedStatuses = ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'];

  // HOWPAPA 통계
  const howpapaInfluencers = allInfluencers.filter((inf) =>
    howpapaProjectIds.includes(inf.project_id)
  );
  const howpapaListup = howpapaInfluencers.filter((inf) =>
    inf.listed_at?.startsWith(today)
  ).length;
  const howpapaAccepted = howpapaInfluencers.filter(
    (inf) => inf.accepted_at?.startsWith(today) ||
             (acceptedStatuses.includes(inf.status) && inf.accepted_at?.startsWith(today))
  ).length;

  // NUCCIO 통계
  const nuccioInfluencers = allInfluencers.filter((inf) =>
    nuccioProjectIds.includes(inf.project_id)
  );
  const nuccioListup = nuccioInfluencers.filter((inf) =>
    inf.listed_at?.startsWith(today)
  ).length;
  const nuccioAccepted = nuccioInfluencers.filter(
    (inf) => inf.accepted_at?.startsWith(today) ||
             (acceptedStatuses.includes(inf.status) && inf.accepted_at?.startsWith(today))
  ).length;

  return {
    howpapa: {
      listup: { actual: howpapaListup, target: KPI_TARGETS.howpapa.listup },
      acceptance: { actual: howpapaAccepted, target: KPI_TARGETS.howpapa.acceptance },
    },
    nuccio: {
      listup: { actual: nuccioListup, target: KPI_TARGETS.nuccio.listup },
      acceptance: { actual: nuccioAccepted, target: KPI_TARGETS.nuccio.acceptance },
    },
  };
}

// ========== 메시지 포맷 ==========

function formatDailyReport(stats: DailyStats): string {
  const today = new Date();
  const dateStr = formatKoreanDate(today);

  const formatBrandStats = (brand: 'HOWPAPA' | 'NUCCIO', data: BrandStats) => {
    const listupPct = Math.round((data.listup.actual / data.listup.target) * 100);
    const acceptPct = Math.round((data.acceptance.actual / data.acceptance.target) * 100);

    return `${brand === 'HOWPAPA' ? '🧡' : '💚'} ${brand}
- 리스트업: ${data.listup.actual}/${data.listup.target} (${listupPct}%) ${getStatusEmoji(listupPct)}
- 수락: ${data.acceptance.actual}/${data.acceptance.target} (${acceptPct}%) ${getStatusEmoji(acceptPct)}`;
  };

  // 종합 달성률 계산
  const totalActual =
    stats.howpapa.listup.actual +
    stats.howpapa.acceptance.actual +
    stats.nuccio.listup.actual +
    stats.nuccio.acceptance.actual;
  const totalTarget =
    stats.howpapa.listup.target +
    stats.howpapa.acceptance.target +
    stats.nuccio.listup.target +
    stats.nuccio.acceptance.target;
  const overallPct = Math.round((totalActual / totalTarget) * 100);

  return `📊 [일일 시딩 리포트] ${dateStr}

${formatBrandStats('HOWPAPA', stats.howpapa)}

${formatBrandStats('NUCCIO', stats.nuccio)}

📈 종합 달성률: ${overallPct}%

✅ 오늘 하루 수고하셨습니다!`;
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

// 메시지 전송
async function sendNaverWorksMessage(message: string): Promise<void> {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
  let privateKey = process.env.NAVER_WORKS_PRIVATE_KEY;

  if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !channelId) {
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
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
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

const reportHandler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // 테스트 모드 확인 (수동 호출 시)
    const isTest = event.queryStringParameters?.test === 'true';

    console.log(`[Daily Report] Starting... (test mode: ${isTest})`);

    // 오늘의 통계 조회
    const stats = await getTodayStats();
    console.log('[Daily Report] Stats:', JSON.stringify(stats));

    // 메시지 생성
    const message = formatDailyReport(stats);
    console.log('[Daily Report] Message:', message);

    // 네이버웍스로 전송 (테스트 모드가 아니거나 환경변수가 있으면)
    if (process.env.NAVER_WORKS_CLIENT_ID) {
      await sendNaverWorksMessage(message);
      console.log('[Daily Report] Sent to Naver Works');
    } else {
      console.log('[Daily Report] Naver Works not configured, skipping send');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: isTest ? message : 'Report sent',
        stats,
      }),
    };
  } catch (error: any) {
    console.error('[Daily Report] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// 스케줄 핸들러: 매일 19:00 KST = UTC 10:00
export const handler = schedule('0 10 * * *', reportHandler);

// 수동 테스트용 엔드포인트
export { reportHandler as testHandler };
