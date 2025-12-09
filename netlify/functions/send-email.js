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

  try {
    const { to, subject, html, text } = JSON.parse(event.body);

    // 네이버 웍스 SMTP 설정
    const transporter = nodemailer.createTransport({
      host: 'smtp.worksmobile.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

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
