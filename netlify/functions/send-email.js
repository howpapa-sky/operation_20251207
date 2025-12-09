const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // 환경변수 체크
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SMTP 설정이 되어있지 않습니다. Netlify 환경변수를 확인해주세요.',
      }),
    };
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body);

    // 네이버 웍스 SMTP 설정 (587 포트 + STARTTLS)
    const transporter = nodemailer.createTransport({
      host: 'smtp.worksmobile.com',
      port: 587,
      secure: false, // STARTTLS 사용
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    });

    // 연결 테스트
    await transporter.verify();

    // 이메일 발송
    const result = await transporter.sendMail({
      from: `하우파파 <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      text: text || '',
      html: html,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '이메일이 성공적으로 발송되었습니다.',
        messageId: result.messageId,
      }),
    };
  } catch (error) {
    console.error('Email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
