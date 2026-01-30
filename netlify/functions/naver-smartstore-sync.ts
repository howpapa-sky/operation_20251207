/**
 * Netlify Function - 네이버 스마트스토어 주문 동기화
 *
 * Supabase Edge Function의 대안으로, Netlify 환경에서 직접 실행
 *
 * 환경변수:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - DB 연결
 *   NAVER_PROXY_URL (선택) - 고정 IP 프록시 서버 URL (예: http://1.2.3.4:3100)
 *   NAVER_PROXY_API_KEY (선택) - 프록시 서버 인증 키
 *
 * 프록시 설정 시: Netlify → 프록시(고정IP) → 네이버 API
 * 프록시 미설정 시: Netlify → 네이버 API (직접 호출, IP 화이트리스트 필요)
 */

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface SyncRequest {
  userId: string;
  clientId: string;
  clientSecret: string;
  startDate: string;
  endDate: string;
}

interface NaverProductOrder {
  productOrderId: string;
  productName: string;
  productOption: string;
  quantity: number;
  unitPrice: number;
  totalPaymentAmount: number;
  productOrderStatus: string;
}

interface NaverOrder {
  orderId: string;
  orderDate: string;
  productOrder: NaverProductOrder;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ========== 프록시 경유 방식 ==========

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

// ========== 직접 호출 방식 ==========

// HMAC-SHA256 서명 생성
function generateSignature(clientId: string, clientSecret: string, timestamp: number): string {
  const message = `${clientId}_${timestamp}`;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

// 토큰 발급
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const timestamp = Date.now();
  const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
  const clientSecretSign = generateSignature(clientId, clientSecret, timestamp);

  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: timestamp.toString(),
    client_secret_sign: clientSecretSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`토큰 발급 실패: ${data.message || data.error || '인증 정보를 확인하세요'}`);
  }

  return data.access_token;
}

// 변경된 주문 목록 조회
async function fetchChangedOrders(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<NaverOrder[]> {
  const allOrders: NaverOrder[] = [];
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
      throw new Error(`주문 조회 실패 (${response.status}): ${(errorData as Record<string, string>).message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    const lastChangeStatuses = data.data?.lastChangeStatuses || [];

    if (lastChangeStatuses.length === 0) {
      hasMore = false;
      break;
    }

    const productOrderIds = lastChangeStatuses.map(
      (item: { productOrderId: string }) => item.productOrderId
    );

    if (productOrderIds.length > 0) {
      const detailOrders = await fetchOrderDetails(accessToken, productOrderIds);
      allOrders.push(...detailOrders);
    }

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
        body: JSON.stringify({ productOrderIds: batch }),
      }
    );

    if (!response.ok) {
      console.error(`상품주문 상세 조회 실패: ${response.status}`);
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

// ========== 핸들러 ==========

const handler: Handler = async (event) => {
  // CORS preflight
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
    const { userId, clientId, clientSecret, startDate, endDate }: SyncRequest = JSON.parse(
      event.body || '{}'
    );

    if (!userId || !clientId || !clientSecret || !startDate || !endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '필수 파라미터가 누락되었습니다.',
        }),
      };
    }

    console.log(`[네이버 동기화] 시작: ${startDate} ~ ${endDate} (user: ${userId})`);

    // 프록시 설정 확인
    const proxyUrl = process.env.NAVER_PROXY_URL;
    const proxyApiKey = process.env.NAVER_PROXY_API_KEY;
    const useProxy = !!proxyUrl && !!proxyApiKey;

    let orders: NaverOrder[];

    if (useProxy) {
      // 프록시 경유: 고정 IP 서버를 통해 네이버 API 호출
      console.log(`[네이버 동기화] 프록시 경유: ${proxyUrl}`);
      orders = await fetchOrdersViaProxy(proxyUrl, proxyApiKey, clientId, clientSecret, startDate, endDate);
    } else {
      // 직접 호출: Netlify에서 네이버 API 직접 호출
      console.log('[네이버 동기화] 직접 호출 모드');
      const accessToken = await getAccessToken(clientId, clientSecret);
      console.log('[네이버 동기화] 토큰 발급 성공');
      orders = await fetchChangedOrders(accessToken, startDate, endDate);
    }

    console.log(`[네이버 동기화] 조회된 주문: ${orders.length}건`);

    // 3. DB에 저장
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Supabase 환경변수가 설정되지 않았습니다.',
        }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
      const { data: existing } = await supabase
        .from('orders_raw')
        .select('id')
        .eq('channel', 'naver_smartstore')
        .eq('order_id', order.orderId)
        .maybeSingle();

      if (existing) {
        await supabase.from('orders_raw').update(record).eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('orders_raw').insert(record);
        created++;
      }
    }

    // 4. api_credentials 동기화 상태 업데이트
    await supabase
      .from('api_credentials')
      .update({
        sync_status: 'success',
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('channel', 'naver_smartstore');

    console.log(`[네이버 동기화] 완료: 생성 ${created}건, 업데이트 ${updated}건`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `네이버 스마트스토어 동기화 완료: ${orders.length}건 조회 (신규 ${created}건, 업데이트 ${updated}건)`,
        data: {
          totalOrders: orders.length,
          created,
          updated,
        },
      }),
    };
  } catch (error) {
    console.error('[네이버 동기화] 에러:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: `동기화 실패: ${(error as Error).message}`,
      }),
    };
  }
};

export { handler };
