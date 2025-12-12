const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// 네이버 웍스 메시지 전송
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

const SITE_URL = process.env.SITE_URL || 'https://howpapa.netlify.app';

// 매일 오전 10시 (KST) 실행 = 1시 (UTC)
exports.handler = async (event, context) => {
  console.log('Daily reminder triggered at:', new Date().toISOString());

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

    // 오늘 마감 프로젝트 (완료/보류 제외)
    const dueTodayProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate.getTime() === today.getTime();
    });

    // 지연된 프로젝트 (목표일이 오늘 이전이고 완료되지 않은 것)
    const delayedProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today;
    });

    // 알림할 내용이 없으면 종료
    if (dueTodayProjects.length === 0 && delayedProjects.length === 0) {
      console.log('No reminders needed today');
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'No reminders needed' }) };
    }

    let message = '';

    // 오늘 마감 프로젝트 알림
    if (dueTodayProjects.length > 0) {
      message += `⏰ [오늘 마감 프로젝트 알림]\n\n`;
      message += `오늘 마감인 프로젝트가 ${dueTodayProjects.length}건 있습니다.\n\n`;

      dueTodayProjects.forEach((p, index) => {
        const projectType = p.type === 'sampling' ? '샘플링' : p.type;
        message += `${index + 1}. ${p.title}\n`;
        message += `   📁 유형: ${projectType}\n`;
        if (p.assignee) message += `   👤 담당자: ${p.assignee}\n`;
        message += `   🔗 ${SITE_URL}/${p.type}/${p.id}\n\n`;
      });
    }

    // 지연된 프로젝트 알림
    if (delayedProjects.length > 0) {
      if (message) message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🚨 [지연 프로젝트 알림]\n\n`;
      message += `마감일이 지난 프로젝트가 ${delayedProjects.length}건 있습니다.\n\n`;

      delayedProjects.forEach((p, index) => {
        const targetDate = new Date(p.target_date);
        const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
        const projectType = p.type === 'sampling' ? '샘플링' : p.type;

        message += `${index + 1}. ${p.title}\n`;
        message += `   📁 유형: ${projectType}\n`;
        message += `   ⚠️ ${diffDays}일 지연\n`;
        if (p.assignee) message += `   👤 담당자: ${p.assignee}\n`;
        message += `   🔗 ${SITE_URL}/${p.type}/${p.id}\n\n`;
      });
    }

    message += `📅 ${today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    // 네이버 웍스로 전송
    await sendNaverWorksMessage(message);

    console.log('Daily reminder sent successfully');
    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error('Daily reminder error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Netlify Scheduled Function 설정 - 매일 오전 10시 (KST) = 1시 (UTC)
exports.config = {
  schedule: "0 1 * * *"
};
