/**
 * Netlify Function - 네이버 스마트스토어 API 연결 테스트
 *
 * Supabase Edge Function(api-test)의 Netlify 대안
 *
 * 환경변수 (선택):
 *   NAVER_PROXY_URL - 고정 IP 프록시 서버 URL
 *   NAVER_PROXY_API_KEY - 프록시 서버 인증 키
 *
 * 프록시 설정 시 네이버 API 테스트는 프록시를 경유합니다.
 */

import { Handler } from '@netlify/functions';
import * as crypto from 'crypto';

interface TestRequest {
  channel: 'cafe24' | 'naver_smartstore' | 'coupang';
  credentials: {
    mallId?: string;
    clientId?: string;
    clientSecret?: string;
    naverClientId?: string;
    naverClientSecret?: string;
    vendorId?: string;
    accessKey?: string;
    secretKey?: string;
  };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// HMAC-SHA256 서명 생성 (네이버 커머스 API)
function generateNaverSignature(clientId: string, clientSecret: string, timestamp: number): string {
  const message = `${clientId}_${timestamp}`;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

// 카페24 API 테스트
async function testCafe24(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { mallId, clientId, clientSecret } = credentials;

  if (!mallId || !clientId || !clientSecret) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  try {
    const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'mall.read_order mall.read_product',
      }).toString(),
    });

    if (response.ok) {
      return { success: true, message: '카페24 API 연결 성공!' };
    } else {
      const error = await response.json();
      return { success: false, message: `카페24 인증 실패: ${error.error_description || error.error || '알 수 없는 오류'}` };
    }
  } catch (error) {
    return { success: false, message: `카페24 연결 오류: ${(error as Error).message}` };
  }
}

// 네이버 스마트스토어 API 테스트
async function testNaver(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { naverClientId, naverClientSecret } = credentials;

  if (!naverClientId || !naverClientSecret) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  // 프록시 설정 확인
  const proxyUrl = process.env.NAVER_PROXY_URL;
  const proxyApiKey = process.env.NAVER_PROXY_API_KEY;

  if (proxyUrl && proxyApiKey) {
    // 프록시 경유 테스트
    try {
      const response = await fetch(`${proxyUrl}/api/naver/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-api-key': proxyApiKey,
        },
        body: JSON.stringify({
          clientId: naverClientId,
          clientSecret: naverClientSecret,
        }),
      });

      const result = await response.json();
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `프록시 연결 실패: ${(error as Error).message}` };
    }
  }

  // 직접 호출 테스트
  try {
    const timestamp = Date.now();
    const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
    const clientSecretSign = generateNaverSignature(naverClientId, naverClientSecret, timestamp);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: naverClientId,
        timestamp: timestamp.toString(),
        client_secret_sign: clientSecretSign,
        grant_type: 'client_credentials',
        type: 'SELF',
      }).toString(),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      return { success: true, message: '네이버 스마트스토어 API 연결 성공!' };
    } else {
      return { success: false, message: `네이버 인증 실패: ${data.message || data.error || 'Client ID 또는 Client Secret을 확인하세요'}` };
    }
  } catch (error) {
    return { success: false, message: `네이버 연결 오류: ${(error as Error).message}` };
  }
}

// 쿠팡 API 테스트
async function testCoupang(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { vendorId, accessKey, secretKey } = credentials;

  if (!vendorId || !accessKey || !secretKey) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  try {
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const method = 'GET';
    const path = '/v2/providers/seller_api/apis/api/v1/vendor/vendors/' + vendorId;

    const message = `${datetime}${method}${path}`;
    const signatureHex = crypto.createHmac('sha256', secretKey).update(message).digest('hex');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signatureHex}`;

    const response = await fetch(`https://api-gateway.coupang.com${path}`, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8',
      },
    });

    if (response.ok) {
      return { success: true, message: '쿠팡 API 연결 성공!' };
    } else {
      const error = await response.json();
      return { success: false, message: `쿠팡 인증 실패: ${error.message || '알 수 없는 오류'}` };
    }
  } catch (error) {
    return { success: false, message: `쿠팡 연결 오류: ${(error as Error).message}` };
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' }),
    };
  }

  try {
    const { channel, credentials }: TestRequest = JSON.parse(event.body || '{}');

    let result: { success: boolean; message: string };

    switch (channel) {
      case 'cafe24':
        result = await testCafe24(credentials);
        break;
      case 'naver_smartstore':
        result = await testNaver(credentials);
        break;
      case 'coupang':
        result = await testCoupang(credentials);
        break;
      default:
        result = { success: false, message: '지원하지 않는 채널입니다.' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: (error as Error).message }),
    };
  }
};

export { handler };
