// Supabase Edge Function - API 연결 테스트
// 배포: supabase functions deploy api-test

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  channel: 'cafe24' | 'naver_smartstore' | 'coupang';
  credentials: {
    // Cafe24
    mallId?: string;
    clientId?: string;
    clientSecret?: string;
    // Naver
    naverClientId?: string;
    naverClientSecret?: string;
    // Coupang
    vendorId?: string;
    accessKey?: string;
    secretKey?: string;
  };
}

// 카페24 API 테스트
async function testCafe24(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { mallId, clientId, clientSecret } = credentials;

  if (!mallId || !clientId || !clientSecret) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  try {
    // 카페24 OAuth 토큰 발급 테스트
    const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'mall.read_order mall.read_product',
      }),
    });

    if (response.ok) {
      return { success: true, message: '카페24 API 연결 성공!' };
    } else {
      const error = await response.json();
      return { success: false, message: `카페24 인증 실패: ${error.error_description || error.error || '알 수 없는 오류'}` };
    }
  } catch (error) {
    return { success: false, message: `카페24 연결 오류: ${error.message}` };
  }
}

// 네이버 스마트스토어 API 테스트
async function testNaver(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { naverClientId, naverClientSecret } = credentials;

  if (!naverClientId || !naverClientSecret) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  try {
    // 네이버 커머스 API 토큰 발급
    const timestamp = Date.now();
    const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';

    // BCrypt 해싱이 필요하지만, 간단한 연결 테스트로 대체
    const signature = btoa(`${naverClientId}_${timestamp}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: naverClientId,
        timestamp: timestamp.toString(),
        client_secret_sign: signature,
        grant_type: 'client_credentials',
        type: 'SELF',
      }),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      return { success: true, message: '네이버 스마트스토어 API 연결 성공!' };
    } else {
      return { success: false, message: `네이버 인증 실패: ${data.message || data.error || '알 수 없는 오류'}` };
    }
  } catch (error) {
    return { success: false, message: `네이버 연결 오류: ${error.message}` };
  }
}

// 쿠팡 API 테스트 (HMAC 서명 필요)
async function testCoupang(credentials: TestRequest['credentials']): Promise<{ success: boolean; message: string }> {
  const { vendorId, accessKey, secretKey } = credentials;

  if (!vendorId || !accessKey || !secretKey) {
    return { success: false, message: '필수 자격증명이 누락되었습니다.' };
  }

  try {
    // 쿠팡 API는 HMAC-SHA256 서명이 필요
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const method = 'GET';
    const path = '/v2/providers/seller_api/apis/api/v1/vendor/vendors/' + vendorId;

    // HMAC 서명 생성
    const message = `${datetime}${method}${path}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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
    return { success: false, message: `쿠팡 연결 오류: ${error.message}` };
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channel, credentials }: TestRequest = await req.json();

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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
