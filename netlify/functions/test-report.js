// 테스트용 - 수동으로 리포트 전송 (네이버웍스 + 이메일)
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

// ==================== 이메일 전송 ====================
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP not configured, skipping email...');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.worksmobile.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  const result = await transporter.sendMail({
    from: `하우파파 프로젝트 알림 <${process.env.SMTP_USER}>`,
    to: to,
    subject: subject,
    html: html,
  });

  return result;
}

// HTML 이메일 템플릿
function generateReportEmailHtml(stats, dateStr) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-card.highlight { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; }
    .stat-value { font-size: 32px; font-weight: 700; margin-bottom: 5px; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .stat-card.highlight .stat-label { color: rgba(255,255,255,0.9); }
    .status-list { background: #f9fafb; border-radius: 12px; padding: 20px; }
    .status-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .status-item:last-child { border-bottom: none; }
    .status-name { display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; }
    .status-count { font-weight: 600; color: #1f2937; }
    .alert-section { margin-top: 25px; padding: 20px; background: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444; }
    .alert-title { font-weight: 600; color: #dc2626; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 일일 현황 리포트</h1>
      <p>${dateStr}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card highlight">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">전체 프로젝트</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.sampling}</div>
          <div class="stat-label">샘플링</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.dueToday}</div>
          <div class="stat-label">오늘 마감</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.dueThisWeek}</div>
          <div class="stat-label">이번 주 마감</div>
        </div>
      </div>

      <div class="status-list">
        <div class="status-item">
          <span class="status-name"><span class="status-dot" style="background: #eab308;"></span> 기획중</span>
          <span class="status-count">${stats.planning}건</span>
        </div>
        <div class="status-item">
          <span class="status-name"><span class="status-dot" style="background: #3b82f6;"></span> 진행중</span>
          <span class="status-count">${stats.inProgress}건</span>
        </div>
        <div class="status-item">
          <span class="status-name"><span class="status-dot" style="background: #8b5cf6;"></span> 검토중</span>
          <span class="status-count">${stats.review}건</span>
        </div>
        <div class="status-item">
          <span class="status-name"><span class="status-dot" style="background: #22c55e;"></span> 완료</span>
          <span class="status-count">${stats.completed}건</span>
        </div>
        <div class="status-item">
          <span class="status-name"><span class="status-dot" style="background: #9ca3af;"></span> 보류</span>
          <span class="status-count">${stats.onHold}건</span>
        </div>
      </div>

      ${stats.delayed > 0 ? `
      <div class="alert-section">
        <div class="alert-title">🚨 지연 프로젝트 ${stats.delayed}건</div>
        <p style="margin: 0; color: #991b1b;">마감일이 지난 프로젝트가 있습니다. 확인이 필요합니다.</p>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>이 리포트는 <a href="${SITE_URL}">하우파파 프로젝트 관리 시스템</a>에서 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
`;
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

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalProjects = projects.length;
    const samplingProjects = projects.filter(p => p.type === 'sampling');

    const statusCount = {
      planning: projects.filter(p => p.status === 'planning').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      review: projects.filter(p => p.status === 'review').length,
      completed: projects.filter(p => p.status === 'completed').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
    };

    const delayedProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today;
    });

    const dueTodayProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate.getTime() === today.getTime();
    });

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeekProjects = projects.filter(p => {
      if (p.status === 'completed' || p.status === 'on_hold') return false;
      if (!p.target_date) return false;
      const targetDate = new Date(p.target_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate >= today && targetDate <= weekEnd;
    });

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

    const results = { naverWorks: null, email: null };

    // 네이버웍스 전송
    try {
      results.naverWorks = await sendNaverWorksMessage(message);
      console.log('Naver Works message sent successfully');
    } catch (err) {
      console.error('Naver Works error:', err.message);
      results.naverWorks = { error: err.message };
    }

    // 이메일 전송
    try {
      const emailTo = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;
      if (emailTo) {
        const stats = {
          total: totalProjects,
          sampling: samplingProjects.length,
          dueToday: dueTodayProjects.length,
          dueThisWeek: dueThisWeekProjects.length,
          planning: statusCount.planning,
          inProgress: statusCount.in_progress,
          review: statusCount.review,
          completed: statusCount.completed,
          onHold: statusCount.on_hold,
          delayed: delayedProjects.length
        };
        const emailHtml = generateReportEmailHtml(stats, dateStr);
        results.email = await sendEmail(emailTo, `[일일 리포트] 프로젝트 현황 - ${dateStr}`, emailHtml);
        console.log('Email sent successfully to:', emailTo);
      }
    } catch (err) {
      console.error('Email error:', err.message);
      results.email = { error: err.message };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Report sent!', results })
    };

  } catch (error) {
    console.error('Test report error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
