// 프로젝트 담당자에게 업무 요청 알림 전송
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase 환경변수
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = process.env.SITE_URL || 'https://operatiom20251207.netlify.app';

// ==================== 네이버웍스 메시지 전송 ====================
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
    console.log('Naver Works not configured, skipping...');
    return null;
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
    throw new Error(`Naver Works message send failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// 프로젝트 타입 라벨
function getProjectTypeLabel(type) {
  const labels = {
    sampling: '샘플링',
    detail_page: '상세페이지 제작',
    influencer: '인플루언서 협업',
    product_order: '제품 발주',
    group_purchase: '공동구매',
    other: '기타'
  };
  return labels[type] || type;
}

// 우선순위 라벨
function getPriorityLabel(priority) {
  const labels = {
    low: '낮음',
    medium: '보통',
    high: '높음',
    urgent: '긴급'
  };
  return labels[priority] || priority;
}

// 우선순위 이모지
function getPriorityEmoji(priority) {
  const emojis = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  };
  return emojis[priority] || '⚪';
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { projectId, projectTitle, projectType, requester, assignee, assigneeId, targetDate, priority } = body;

    if (!projectId || !assignee) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // 알림 메시지 생성
    const typeLabel = getProjectTypeLabel(projectType);
    const priorityLabel = getPriorityLabel(priority);
    const priorityEmoji = getPriorityEmoji(priority);

    let message = `📋 [업무 요청 알림]\n\n`;
    message += `${assignee}님에게 새로운 업무가 할당되었습니다.\n\n`;
    message += `📌 프로젝트: ${projectTitle}\n`;
    message += `📁 유형: ${typeLabel}\n`;
    message += `${priorityEmoji} 우선순위: ${priorityLabel}\n`;
    if (targetDate) {
      message += `📅 목표일: ${targetDate}\n`;
    }
    if (requester) {
      message += `👤 요청자: ${requester}\n`;
    }
    message += `\n🔗 ${SITE_URL}/${projectType}/${projectId}`;

    // 네이버웍스 메시지 전송
    const result = await sendNaverWorksMessage(message);

    console.log('Notification sent to assignee:', assignee);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Notification sent', result })
    };

  } catch (error) {
    console.error('Notify assignee error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
