const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// 네이버 웍스 메시지 전송 (send-naver-works 함수 로직 재사용)
const crypto = require('crypto');

function createJWT(clientId, serviceAccountId, privateKey) {
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

async function getAccessToken(clientId, clientSecret, serviceAccountId, privateKey) {
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
    body: params.toString()
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

async function sendNaverWorksMessage(message) {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

  let privateKey = process.env.NAVER_WORKS_PRIVATE_KEY;
  if (privateKey && !privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch (e) {}
  }
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !channelId) {
    throw new Error('Missing Naver Works configuration');
  }

  const accessToken = await getAccessToken(clientId, clientSecret, serviceAccountId, privateKey);

  const response = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: { type: 'text', text: message } })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Message send failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// 매일 오전 9시 (KST) 실행 = 0시 (UTC)
exports.handler = async (event, context) => {
  console.log('Daily report triggered at:', new Date().toISOString());

  try {
    // 모든 프로젝트 가져오기
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 통계 계산
    const totalProjects = projects.length;
    const samplingProjects = projects.filter(p => p.type === 'sampling');

    // 상태별 분류
    const statusCount = {
      planning: projects.filter(p => p.status === 'planning').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      review: projects.filter(p => p.status === 'review').length,
      completed: projects.filter(p => p.status === 'completed').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
    };

    // 지연된 프로젝트 (목표일이 오늘 이전이고 완료되지 않은 것)
    const delayedProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today;
    });

    // 오늘 마감 프로젝트
    const dueTodayProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate.getTime() === today.getTime();
    });

    // 이번 주 마감 프로젝트
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeekProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate >= today && targetDate <= weekEnd;
    });

    // 메시지 생성
    const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    let message = `📊 [일일 현황 리포트]\n📅 ${dateStr}\n\n`;

    message += `📈 전체 현황\n`;
    message += `├ 전체 프로젝트: ${totalProjects}건\n`;
    message += `├ 샘플링: ${samplingProjects.length}건\n`;
    message += `└ 기타: ${totalProjects - samplingProjects.length}건\n\n`;

    message += `📋 상태별 현황\n`;
    message += `├ 🟡 기획중: ${statusCount.planning}건\n`;
    message += `├ 🔵 진행중: ${statusCount.in_progress}건\n`;
    message += `├ 🟣 검토중: ${statusCount.review}건\n`;
    message += `├ 🟢 완료: ${statusCount.completed}건\n`;
    message += `└ ⚪ 보류: ${statusCount.on_hold}건\n\n`;

    if (delayedProjects.length > 0) {
      message += `🚨 지연 프로젝트: ${delayedProjects.length}건\n`;
      delayedProjects.slice(0, 5).forEach(p => {
        message += `└ ${p.title}\n`;
      });
      if (delayedProjects.length > 5) {
        message += `   외 ${delayedProjects.length - 5}건...\n`;
      }
      message += `\n`;
    }

    if (dueTodayProjects.length > 0) {
      message += `⏰ 오늘 마감: ${dueTodayProjects.length}건\n`;
      dueTodayProjects.forEach(p => {
        message += `└ ${p.title}\n`;
      });
      message += `\n`;
    }

    message += `📅 이번 주 마감 예정: ${dueThisWeekProjects.length}건`;

    // 네이버 웍스로 전송
    await sendNaverWorksMessage(message);

    console.log('Daily report sent successfully');
    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error('Daily report error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Netlify Scheduled Function 설정 - 매일 오전 9시 (KST) = 0시 (UTC)
exports.config = {
  schedule: "0 0 * * *"
};
