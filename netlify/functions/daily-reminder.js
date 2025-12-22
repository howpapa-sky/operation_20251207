const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Supabase 환경변수 (VITE_ 접두사 있는 버전과 없는 버전 모두 지원)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ==================== 이메일 전송 ====================
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP not configured, skipping email...');
    return null;
  }

  // 네이버 웍스 SMTP 설정
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

// HTML 이메일 템플릿 생성
function generateEmailHtml(dueTodayProjects, delayedProjects, siteUrl, dateStr) {
  let html = `
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
    .section { margin-bottom: 30px; }
    .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .section-title.danger { border-color: #ef4444; }
    .section-title.warning { border-color: #f59e0b; }
    .section-title h2 { margin: 0; font-size: 18px; color: #1f2937; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .badge-danger { background: #fef2f2; color: #dc2626; }
    .badge-warning { background: #fffbeb; color: #d97706; }
    .project-card { background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #3b82f6; }
    .project-card.delayed { border-left-color: #ef4444; }
    .project-card.today { border-left-color: #f59e0b; }
    .project-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 16px; }
    .project-meta { color: #6b7280; font-size: 14px; margin-bottom: 4px; }
    .project-link { display: inline-block; margin-top: 10px; color: #3b82f6; text-decoration: none; font-weight: 500; }
    .project-link:hover { text-decoration: underline; }
    .delay-badge { display: inline-block; background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 프로젝트 알림</h1>
      <p>${dateStr}</p>
    </div>
    <div class="content">
`;

  // 오늘 마감 프로젝트
  if (dueTodayProjects.length > 0) {
    html += `
      <div class="section">
        <div class="section-title warning">
          <h2>⏰ 오늘 마감 프로젝트</h2>
          <span class="badge badge-warning">${dueTodayProjects.length}건</span>
        </div>
`;
    dueTodayProjects.forEach(p => {
      const projectType = getProjectTypeLabel(p.type);
      html += `
        <div class="project-card today">
          <div class="project-title">${escapeHtml(p.title)}</div>
          <div class="project-meta">📁 ${projectType}</div>
          ${p.assignee ? `<div class="project-meta">👤 ${escapeHtml(p.assignee)}</div>` : ''}
          <a href="${siteUrl}/${p.type}/${p.id}" class="project-link">프로젝트 보기 →</a>
        </div>
`;
    });
    html += `</div>`;
  }

  // 지연된 프로젝트
  if (delayedProjects.length > 0) {
    html += `
      <div class="section">
        <div class="section-title danger">
          <h2>🚨 지연 프로젝트</h2>
          <span class="badge badge-danger">${delayedProjects.length}건</span>
        </div>
`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    delayedProjects.forEach(p => {
      const targetDate = new Date(p.target_date);
      const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
      const projectType = getProjectTypeLabel(p.type);

      html += `
        <div class="project-card delayed">
          <div class="project-title">${escapeHtml(p.title)} <span class="delay-badge">${diffDays}일 지연</span></div>
          <div class="project-meta">📁 ${projectType}</div>
          ${p.assignee ? `<div class="project-meta">👤 ${escapeHtml(p.assignee)}</div>` : ''}
          <a href="${siteUrl}/${p.type}/${p.id}" class="project-link">프로젝트 보기 →</a>
        </div>
`;
    });
    html += `</div>`;
  }

  html += `
    </div>
    <div class="footer">
      <p>이 알림은 <a href="${siteUrl}">하우파파 프로젝트 관리 시스템</a>에서 발송되었습니다.</p>
      <p>알림 설정은 <a href="${siteUrl}/settings">설정 페이지</a>에서 변경할 수 있습니다.</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

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

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SITE_URL = process.env.SITE_URL || 'https://operatiom20251207.netlify.app';

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

    const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const results = { naverWorks: null, email: null };

    // ==================== 네이버웍스 메시지 생성 및 전송 ====================
    let naverWorksMessage = '';

    if (dueTodayProjects.length > 0) {
      naverWorksMessage += `⏰ [오늘 마감 프로젝트 알림]\n\n`;
      naverWorksMessage += `오늘 마감인 프로젝트가 ${dueTodayProjects.length}건 있습니다.\n\n`;

      dueTodayProjects.forEach((p, index) => {
        const projectType = getProjectTypeLabel(p.type);
        naverWorksMessage += `${index + 1}. ${p.title}\n`;
        naverWorksMessage += `   📁 유형: ${projectType}\n`;
        if (p.assignee) naverWorksMessage += `   👤 담당자: ${p.assignee}\n`;
        naverWorksMessage += `   🔗 ${SITE_URL}/${p.type}/${p.id}\n\n`;
      });
    }

    if (delayedProjects.length > 0) {
      if (naverWorksMessage) naverWorksMessage += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      naverWorksMessage += `🚨 [지연 프로젝트 알림]\n\n`;
      naverWorksMessage += `마감일이 지난 프로젝트가 ${delayedProjects.length}건 있습니다.\n\n`;

      delayedProjects.forEach((p, index) => {
        const targetDate = new Date(p.target_date);
        const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
        const projectType = getProjectTypeLabel(p.type);

        naverWorksMessage += `${index + 1}. ${p.title}\n`;
        naverWorksMessage += `   📁 유형: ${projectType}\n`;
        naverWorksMessage += `   ⚠️ ${diffDays}일 지연\n`;
        if (p.assignee) naverWorksMessage += `   👤 담당자: ${p.assignee}\n`;
        naverWorksMessage += `   🔗 ${SITE_URL}/${p.type}/${p.id}\n\n`;
      });
    }

    naverWorksMessage += `📅 ${dateStr}`;

    // 네이버웍스 전송
    try {
      results.naverWorks = await sendNaverWorksMessage(naverWorksMessage);
      console.log('Naver Works message sent successfully');
    } catch (err) {
      console.error('Naver Works error:', err.message);
      results.naverWorks = { error: err.message };
    }

    // ==================== 이메일 전송 ====================
    try {
      const emailTo = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;
      if (emailTo) {
        const emailSubject = dueTodayProjects.length > 0 && delayedProjects.length > 0
          ? `[프로젝트 알림] 오늘 마감 ${dueTodayProjects.length}건, 지연 ${delayedProjects.length}건`
          : dueTodayProjects.length > 0
          ? `[프로젝트 알림] 오늘 마감 프로젝트 ${dueTodayProjects.length}건`
          : `[프로젝트 알림] 지연 프로젝트 ${delayedProjects.length}건`;

        const emailHtml = generateEmailHtml(dueTodayProjects, delayedProjects, SITE_URL, dateStr);
        results.email = await sendEmail(emailTo, emailSubject, emailHtml);
        console.log('Email sent successfully to:', emailTo);
      }
    } catch (err) {
      console.error('Email error:', err.message);
      results.email = { error: err.message };
    }

    console.log('Daily reminder completed');
    return { statusCode: 200, body: JSON.stringify({ success: true, results }) };

  } catch (error) {
    console.error('Daily reminder error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Netlify Scheduled Function 설정 - 매일 오전 10시 (KST) = 1시 (UTC)
exports.config = {
  schedule: "0 1 * * *"
};
