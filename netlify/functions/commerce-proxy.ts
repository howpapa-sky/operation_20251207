import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// ========== 환경변수 ==========
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const naverProxyUrl = process.env.NAVER_PROXY_URL;
const naverProxyApiKey = process.env.NAVER_PROXY_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== 타입 ==========
interface SyncOrdersParams {
  channel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface NaverOrder {
  orderId: string;
  productOrderId?: string;
  orderDate: string;
  orderDatetime?: string;
  productName?: string;
  optionName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shippingFee?: number;
  discountAmount?: number;
  orderStatus?: string;
  buyerName?: string;
  buyerPhone?: string;
  shippingAddress?: string;
  rawData?: Record<string, unknown>;
}

// ========== CORS 헤더 ==========
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ========== 유틸 ==========
function toDateStr(value: string | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
  return null;
}

function toNumber(value: unknown, defaultVal = 0): number {
  if (value === undefined || value === null) return defaultVal;
  const num = Number(value);
  return isNaN(num) ? defaultVal : num;
}

// ========== 네이버 프록시 호출 ==========
async function callNaverProxy(path: string, params?: Record<string, string>): Promise<any> {
  if (!naverProxyUrl || !naverProxyApiKey) {
    throw new Error('NAVER_PROXY_URL 또는 NAVER_PROXY_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const url = new URL(path, naverProxyUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  console.log(`[commerce-proxy] Calling proxy: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': naverProxyApiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[commerce-proxy] Proxy error: ${response.status} ${errorText}`);
    throw new Error(`프록시 서버 오류: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ========== 연결 테스트 ==========
async function testConnection(channel: string) {
  if (channel === 'smartstore') {
    try {
      const result = await callNaverProxy('/api/health');
      return {
        success: true,
        message: '네이버 스마트스토어 프록시 연결 성공',
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `연결 실패: ${error.message}`,
      };
    }
  }

  return {
    success: false,
    message: `${channel} 채널은 아직 지원되지 않습니다.`,
  };
}

// ========== SKU 매칭 ==========
async function matchSKU(channel: string, optionName: string | undefined): Promise<{
  skuId: string | null;
  costPrice: number;
}> {
  if (!optionName) return { skuId: null, costPrice: 0 };

  try {
    // channel_option_mapping에서 매칭
    const { data: mapping } = await supabase
      .from('channel_option_mapping')
      .select('sku_id')
      .eq('channel', channel)
      .eq('option_name', optionName)
      .eq('is_active', true)
      .single();

    if (mapping?.sku_id) {
      // SKU 원가 조회
      const { data: sku } = await supabase
        .from('sku_master')
        .select('cost_price')
        .eq('id', mapping.sku_id)
        .single();

      return {
        skuId: mapping.sku_id,
        costPrice: sku?.cost_price ? parseFloat(sku.cost_price) : 0,
      };
    }
  } catch {
    // 매칭 실패는 정상 케이스 (아직 매핑 안됨)
  }

  return { skuId: null, costPrice: 0 };
}

// ========== 채널 수수료율 조회 ==========
async function getChannelFeeRate(channel: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('sales_channel_settings')
      .select('fee_rate')
      .eq('channel', channel)
      .single();
    return data?.fee_rate ? parseFloat(data.fee_rate) : 0;
  } catch {
    // 기본 수수료율
    const defaults: Record<string, number> = {
      smartstore: 5.5,
      coupang: 12.0,
      coupang_rocket: 35.0,
      cafe24: 3.0,
      qoo10: 10.0,
    };
    return defaults[channel] || 0;
  }
}

// ========== 네이버 주문 변환 ==========
function transformNaverOrder(raw: Record<string, unknown>): NaverOrder {
  // Naver Commerce API 응답 형식 변환
  // productOrder 필드가 있는 경우 (상세 조회)
  const po = (raw.productOrder || raw) as Record<string, unknown>;

  return {
    orderId: String(po.orderId || po.order_id || raw.orderId || ''),
    productOrderId: po.productOrderId ? String(po.productOrderId) : undefined,
    orderDate: String(po.orderDate || po.order_date || po.paymentDate || ''),
    orderDatetime: po.orderDatetime ? String(po.orderDatetime) : undefined,
    productName: po.productName ? String(po.productName) : (po.product_name ? String(po.product_name) : undefined),
    optionName: po.optionInfo ? String(po.optionInfo) : (po.optionName || po.option_name ? String(po.optionName || po.option_name) : undefined),
    quantity: toNumber(po.quantity, 1),
    unitPrice: toNumber(po.unitPrice || po.unit_price || po.salePrice),
    totalPrice: toNumber(po.totalPaymentAmount || po.totalPrice || po.total_price),
    shippingFee: toNumber(po.deliveryFeeAmount || po.shippingFee || po.shipping_fee),
    discountAmount: toNumber(po.totalDiscountAmount || po.discountAmount || po.discount_amount),
    orderStatus: po.productOrderStatus ? String(po.productOrderStatus) : (po.orderStatus ? String(po.orderStatus) : undefined),
    buyerName: po.ordererName ? String(po.ordererName) : (po.buyerName ? String(po.buyerName) : undefined),
    buyerPhone: po.ordererTel ? String(po.ordererTel) : undefined,
    shippingAddress: po.shippingAddress ? String(po.shippingAddress) : undefined,
    rawData: raw,
  };
}

// ========== 데이터 검증 ==========
function validateOrder(order: NaverOrder, rowIndex: number): string[] {
  const errors: string[] = [];

  if (!order.orderId) {
    errors.push(`행 ${rowIndex}: 주문번호가 없습니다.`);
  }

  if (!order.orderDate) {
    errors.push(`행 ${rowIndex}: 주문일자가 없습니다.`);
  } else {
    const dateStr = toDateStr(order.orderDate);
    if (!dateStr) {
      errors.push(`행 ${rowIndex}: 주문일자 형식이 올바르지 않습니다. (${order.orderDate})`);
    }
  }

  if (order.totalPrice <= 0 && order.unitPrice <= 0) {
    errors.push(`행 ${rowIndex}: 금액 정보가 유효하지 않습니다.`);
  }

  if (order.quantity <= 0) {
    errors.push(`행 ${rowIndex}: 수량이 유효하지 않습니다.`);
  }

  return errors;
}

// ========== 주문 동기화 ==========
async function syncOrders(params: SyncOrdersParams) {
  const { channel, startDate, endDate } = params;

  // 날짜 검증
  if (!startDate || !endDate) {
    return { success: false, error: '시작일과 종료일을 입력해주세요.' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: '날짜 형식이 올바르지 않습니다.' };
  }

  if (start > end) {
    return { success: false, error: '시작일이 종료일보다 클 수 없습니다.' };
  }

  console.log(`[commerce-proxy] Syncing ${channel} orders: ${startDate} ~ ${endDate}`);

  let rawOrders: Record<string, unknown>[] = [];

  // 채널별 주문 데이터 가져오기
  if (channel === 'smartstore') {
    try {
      const result = await callNaverProxy('/api/orders', {
        startDate,
        endDate,
      });

      // 프록시 응답 형식: { success, data, total } 또는 배열
      if (Array.isArray(result)) {
        rawOrders = result;
      } else if (result.data && Array.isArray(result.data)) {
        rawOrders = result.data;
      } else if (result.orders && Array.isArray(result.orders)) {
        rawOrders = result.orders;
      } else {
        console.log('[commerce-proxy] Unexpected response format:', JSON.stringify(result).substring(0, 500));
        return {
          success: false,
          error: '프록시 서버에서 예상치 못한 응답 형식을 받았습니다.',
          rawResponse: result,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `스마트스토어 주문 조회 실패: ${error.message}`,
      };
    }
  } else {
    return {
      success: false,
      error: `${channel} 채널은 아직 지원되지 않습니다.`,
    };
  }

  if (rawOrders.length === 0) {
    return {
      success: true,
      message: '해당 기간에 주문이 없습니다.',
      synced: 0,
      skipped: 0,
      errors: [],
    };
  }

  console.log(`[commerce-proxy] Fetched ${rawOrders.length} orders from proxy`);

  // 수수료율 조회
  const feeRate = await getChannelFeeRate(channel);

  // 주문 데이터 변환 및 검증
  const validOrders: any[] = [];
  const allErrors: string[] = [];
  let skippedCount = 0;

  for (let i = 0; i < rawOrders.length; i++) {
    const raw = rawOrders[i];
    const order = transformNaverOrder(raw);

    // 검증
    const errors = validateOrder(order, i + 1);
    if (errors.length > 0) {
      allErrors.push(...errors);
      skippedCount++;
      continue;
    }

    // 주문번호에 productOrderId를 포함 (중복 방지)
    const uniqueOrderId = order.productOrderId
      ? `${order.orderId}-${order.productOrderId}`
      : order.orderId;

    // SKU 매칭
    const { skuId, costPrice } = await matchSKU(channel, order.optionName);

    // 채널 수수료 계산
    const totalPrice = order.totalPrice || (order.unitPrice * order.quantity);
    const channelFee = Math.round(totalPrice * (feeRate / 100));
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;

    // 이익 계산
    const totalCost = costPrice * order.quantity;
    const profit = totalPrice - totalCost - channelFee - shippingFee - discount;

    const orderRecord = {
      channel,
      order_id: uniqueOrderId,
      order_date: toDateStr(order.orderDate),
      order_datetime: order.orderDatetime || null,
      product_name: order.productName || null,
      option_name: order.optionName || null,
      sku_id: skuId,
      quantity: order.quantity,
      unit_price: order.unitPrice || Math.round(totalPrice / order.quantity),
      total_price: totalPrice,
      shipping_fee: shippingFee,
      discount_amount: discount,
      channel_fee: channelFee,
      cost_price: costPrice,
      profit,
      order_status: order.orderStatus || null,
      buyer_name: order.buyerName || null,
      buyer_phone: order.buyerPhone || null,
      shipping_address: order.shippingAddress || null,
      currency: 'KRW',
      exchange_rate: 1,
      raw_data: order.rawData || null,
    };

    validOrders.push(orderRecord);
  }

  if (validOrders.length === 0) {
    return {
      success: false,
      error: '유효한 주문 데이터가 없습니다.',
      errors: allErrors,
    };
  }

  // Supabase에 upsert (중복 방지: channel + order_id UNIQUE 제약)
  console.log(`[commerce-proxy] Upserting ${validOrders.length} orders to Supabase`);

  const { data, error: dbError } = await supabase
    .from('orders_raw')
    .upsert(validOrders, {
      onConflict: 'channel,order_id',
      ignoreDuplicates: false,
    })
    .select('id');

  if (dbError) {
    console.error('[commerce-proxy] DB error:', dbError);
    return {
      success: false,
      error: `데이터 저장 오류: ${dbError.message}`,
      errors: allErrors,
    };
  }

  // 동기화 로그 기록
  try {
    await supabase.from('api_sync_logs').insert({
      channel,
      sync_type: 'manual',
      status: 'success',
      records_fetched: rawOrders.length,
      records_created: data?.length || validOrders.length,
      records_updated: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  } catch {
    // 로그 기록 실패는 무시
  }

  // sales_channel_settings 업데이트
  try {
    await supabase
      .from('sales_channel_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
      })
      .eq('channel', channel);
  } catch {
    // 업데이트 실패는 무시
  }

  return {
    success: true,
    message: `${validOrders.length}건의 주문이 동기화되었습니다.`,
    synced: data?.length || validOrders.length,
    skipped: skippedCount,
    total: rawOrders.length,
    errors: allErrors,
  };
}

// ========== Handler ==========
const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // 환경변수 확인
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.',
        }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, ...params } = body;

    let result;

    switch (action) {
      case 'test-connection':
        result = await testConnection(params.channel || 'smartstore');
        break;

      case 'sync-orders':
        result = await syncOrders({
          channel: params.channel || 'smartstore',
          startDate: params.startDate,
          endDate: params.endDate,
        });
        break;

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: `알 수 없는 action: ${action}` }),
        };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('[commerce-proxy] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || '서버 내부 오류가 발생했습니다.',
      }),
    };
  }
};

export { handler };
