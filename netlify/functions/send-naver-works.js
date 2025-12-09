const crypto = require('crypto');

// JWT 생성 함수
function createJWT(clientId, serviceAccountId, privateKey) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccountId,
    iat: now,
    exp: now + 3600 // 1시간 유효
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
async function getAccessToken(clientId, clientSecret, serviceAccountId, privateKey, scope) {
  const jwt = createJWT(clientId, serviceAccountId, privateKey);

  const params = new URLSearchParams();
  params.append('assertion', jwt);
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', scope);

  const response = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// 메시지 전송
async function sendMessage(accessToken, botId, channelId, message) {
  const response = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          type: 'text',
          text: message
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Message send failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Flex 메시지 전송 (카드 형태)
async function sendFlexMessage(accessToken, botId, channelId, flexContent) {
  const response = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: flexContent
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flex message send failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { message, messageType = 'text', flexContent, channelId: customChannelId } = body;

    // 환경 변수에서 설정 가져오기
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const serviceAccountId = process.env.NAVER_WORKS_SERVICE_ACCOUNT;
    const privateKey = process.env.NAVER_WORKS_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const defaultChannelId = process.env.NAVER_WORKS_CHANNEL_ID;

    const channelId = customChannelId || defaultChannelId;

    if (!clientId || !clientSecret || !serviceAccountId || !privateKey || !botId || !channelId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Naver Works configuration' })
      };
    }

    // Access Token 발급
    const accessToken = await getAccessToken(
      clientId,
      clientSecret,
      serviceAccountId,
      privateKey,
      'bot bot.message'
    );

    let result;

    // 메시지 타입에 따라 전송
    if (messageType === 'flex' && flexContent) {
      result = await sendFlexMessage(accessToken, botId, channelId, flexContent);
    } else {
      if (!message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Message is required' })
        };
      }
      result = await sendMessage(accessToken, botId, channelId, message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, result })
    };

  } catch (error) {
    console.error('Naver Works error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
