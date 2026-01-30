// Supabase Edge Function - 네이버 스마트스토어 주문 동기화
// 배포: supabase functions deploy naver-smartstore-sync
//
// 환경변수 (선택):
//   NAVER_PROXY_URL - 고정 IP 프록시 서버 URL
//   NAVER_PROXY_API_KEY - 프록시 서버 인증 키

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  userId: string;
  clientId: string;
  clientSecret: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface NaverOrder {
  orderId: string;
  orderDate: string;
  productOrder: {
    productOrderId: string;
    productName: string;
    productOption: string;
    quantity: number;
    unitPrice: number;
    totalPaymentAmount: number;
    productOrderStatus: string;
  };
}

// HMAC-SHA256 서명 생성
async function generateSignature(clientId: string, clientSecret: string, timestamp: number): Promise<string> {
  const message = `${clientId}_${timestamp}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(clientSecret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 토큰 발급
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const timestamp = Date.now();
  const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
  const clientSecretSign = await generateSignature(clientId, clientSecret, timestamp);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      timestamp: timestamp.toString(),
      client_secret_sign: clientSecretSign,
      grant_type: 'client_credentials',
      type: 'SELF',
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`토큰 발급 실패: ${data.message || data.error || '인증 정보를 확인하세요'}`);
  }

  return data.access_token;
}

// 주문 목록 조회 (변경된 주문 기반)
async function fetchChangedOrders(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<NaverOrder[]> {
  const allOrders: NaverOrder[] = [];

  // 네이버 커머스 API: 변경된 주문 목록 조회
  // lastChangedFrom ~ lastChangedTo 기간 동안 변경된 주문 조회
  const lastChangedFrom = `${startDate}T00:00:00.000+09:00`;
  const lastChangedTo = `${endDate}T23:59:59.999+09:00`;

  let moreSequence: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      lastChangedFrom,
      lastChangedTo,
    });

    if (moreSequence) {
      params.set('moreSequence', moreSequence);
    }

    const url = `https://api.commerce.naver.com/external/v1/pay-order/seller/orders/last-changed-statuses?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`주문 조회 실패 (${response.status}): ${errorData.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    const lastChangeStatuses = data.data?.lastChangeStatuses || [];

    if (lastChangeStatuses.length === 0) {
      hasMore = false;
      break;
    }

    // 상품주문번호 목록 수집
    const productOrderIds = lastChangeStatuses.map(
      (item: { productOrderId: string }) => item.productOrderId
    );

    // 상품주문 상세 조회
    if (productOrderIds.length > 0) {
      const detailOrders = await fetchOrderDetails(accessToken, productOrderIds);
      allOrders.push(...detailOrders);
    }

    // 다음 페이지 확인
    moreSequence = data.data?.moreSequence || null;
    hasMore = !!moreSequence;
  }

  return allOrders;
}

// 상품주문 상세 조회
async function fetchOrderDetails(
  accessToken: string,
  productOrderIds: string[]
): Promise<NaverOrder[]> {
  const orders: NaverOrder[] = [];

  // 한 번에 최대 300개까지 조회 가능
  const batchSize = 300;
  for (let i = 0; i < productOrderIds.length; i += batchSize) {
    const batch = productOrderIds.slice(i, i + batchSize);

    const response = await fetch(
      'https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productOrderIds: batch,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`상품주문 상세 조회 실패: ${errorData.message || response.status}`);
      continue;
    }

    const data = await response.json();
    const productOrders = data.data || [];

    for (const po of productOrders) {
      orders.push({
        orderId: po.order?.orderId || '',
        orderDate: po.order?.orderDate || '',
        productOrder: {
          productOrderId: po.productOrderId || '',
          productName: po.productOrder?.productName || '',
          productOption: po.productOrder?.productOption || '',
          quantity: po.productOrder?.quantity || 1,
          unitPrice: po.productOrder?.unitPrice || 0,
          totalPaymentAmount: po.productOrder?.totalPaymentAmount || 0,
          productOrderStatus: po.productOrder?.productOrderStatus || '',
        },
      });
    }
  }

  return orders;
}

// 주문 데이터를 DB에 저장 (orders_raw 테이블 사용)
async function saveOrdersToDb(
  supabaseClient: ReturnType<typeof createClient>,
  _userId: string,
  orders: NaverOrder[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const order of orders) {
    const orderDate = order.orderDate
      ? order.orderDate.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const record = {
      channel: 'naver_smartstore',
      order_id: order.orderId,
      order_date: orderDate,
      order_datetime: order.orderDate || null,
      product_name: order.productOrder.productName,
      option_name: order.productOrder.productOption,
      quantity: order.productOrder.quantity,
      unit_price: order.productOrder.unitPrice,
      total_price: order.productOrder.totalPaymentAmount,
      order_status: order.productOrder.productOrderStatus,
      raw_data: order,
    };

    // channel + order_id 기준으로 upsert (UNIQUE 제약 활용)
    const { data: existing } = await supabaseClient
      .from('orders_raw')
      .select('id')
      .eq('channel', 'naver_smartstore')
      .eq('order_id', order.orderId)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from('orders_raw')
        .update(record)
        .eq('id', existing.id);
      updated++;
    } else {
      await supabaseClient
        .from('orders_raw')
        .insert(record);
      created++;
    }
  }

  return { created, updated };
}

// 프록시를 통해 주문 데이터 조회
async function fetchOrdersViaProxy(
  proxyUrl: string,
  proxyApiKey: string,
  clientId: string,
  clientSecret: string,
  startDate: string,
  endDate: string
): Promise<NaverOrder[]> {
  const response = await fetch(`${proxyUrl}/api/naver/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-proxy-api-key': proxyApiKey,
    },
    body: JSON.stringify({ clientId, clientSecret, startDate, endDate }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || '프록시 동기화 실패');
  }

  return result.data?.orders || [];
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, clientId, clientSecret, startDate, endDate }: SyncRequest = await req.json();

    // 입력 검증
    if (!userId || !clientId || !clientSecret || !startDate || !endDate) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '필수 파라미터가 누락되었습니다. (userId, clientId, clientSecret, startDate, endDate)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`[네이버 동기화] 시작: ${startDate} ~ ${endDate} (user: ${userId})`);

    // 프록시 설정 확인
    const proxyUrl = Deno.env.get('NAVER_PROXY_URL');
    const proxyApiKey = Deno.env.get('NAVER_PROXY_API_KEY');
    const useProxy = !!proxyUrl && !!proxyApiKey;

    let orders: NaverOrder[];

    if (useProxy) {
      console.log(`[네이버 동기화] 프록시 경유: ${proxyUrl}`);
      orders = await fetchOrdersViaProxy(proxyUrl, proxyApiKey, clientId, clientSecret, startDate, endDate);
    } else {
      console.log('[네이버 동기화] 직접 호출 모드');
      const accessToken = await getAccessToken(clientId, clientSecret);
      console.log('[네이버 동기화] 토큰 발급 성공');
      orders = await fetchChangedOrders(accessToken, startDate, endDate);
    }

    console.log(`[네이버 동기화] 조회된 주문: ${orders.length}건`);

    // 3. DB에 저장
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { created, updated } = await saveOrdersToDb(supabaseClient, userId, orders);
    console.log(`[네이버 동기화] 완료: 생성 ${created}건, 업데이트 ${updated}건`);

    // 4. api_credentials 동기화 상태 업데이트
    await supabaseClient
      .from('api_credentials')
      .update({
        sync_status: 'success',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('channel', 'naver_smartstore');

    return new Response(
      JSON.stringify({
        success: true,
        message: `네이버 스마트스토어 동기화 완료: ${orders.length}건 조회 (신규 ${created}건, 업데이트 ${updated}건)`,
        data: {
          totalOrders: orders.length,
          created,
          updated,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[네이버 동기화] 에러:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `동기화 실패: ${error.message}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
