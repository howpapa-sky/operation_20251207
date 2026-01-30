import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// ========== 환경변수 ==========
const PROXY_URL = process.env.NAVER_PROXY_URL || "http://49.50.131.90:3100";
const PROXY_API_KEY = process.env.NAVER_PROXY_API_KEY || "";
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== CORS 헤더 ==========
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ========== 프록시 요청 타입 ==========
interface CommerceProxyRequest {
  action: "naver_token" | "naver_api" | "proxy" | "test-connection" | "sync-orders";
  // Naver token
  clientId?: string;
  clientSecret?: string;
  // Naver API
  apiPath?: string;
  accessToken?: string;
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  // Generic proxy
  url?: string;
  headers?: Record<string, string>;
  // Sync orders
  channel?: string;
  startDate?: string;
  endDate?: string;
}

// ========== 주문 동기화 타입 ==========
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

// ========== 유틸 ==========
function toDateStr(value: string | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
  return null;
}

function toNumber(value: unknown, defaultVal = 0): number {
  if (value === undefined || value === null) return defaultVal;
  const num = Number(value);
  return isNaN(num) ? defaultVal : num;
}

// ========== 네이버 자격증명 조회 ==========
async function getNaverCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const { data: clientIdData } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", "NAVER_CLIENT_ID")
    .single();

  const { data: clientSecretData } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", "NAVER_CLIENT_SECRET")
    .single();

  if (!clientIdData?.value || !clientSecretData?.value) {
    throw new Error("네이버 API 자격증명이 설정되지 않았습니다. app_secrets에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 등록해주세요.");
  }

  return {
    clientId: clientIdData.value,
    clientSecret: clientSecretData.value,
  };
}

// ========== 연결 테스트 ==========
async function testConnection(channel: string) {
  if (channel === "smartstore") {
    try {
      const { clientId, clientSecret } = await getNaverCredentials();

      const response = await fetch(`${PROXY_URL}/api/naver/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-proxy-api-key": PROXY_API_KEY,
        },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      const result = await response.json();
      return {
        success: result.success === true,
        message: result.message || (result.success ? "연결 성공" : "연결 실패"),
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
async function matchSKU(
  channel: string,
  optionName: string | undefined
): Promise<{ skuId: string | null; costPrice: number }> {
  if (!optionName) return { skuId: null, costPrice: 0 };

  try {
    const { data: mapping } = await supabase
      .from("channel_option_mapping")
      .select("sku_id")
      .eq("channel", channel)
      .eq("option_name", optionName)
      .eq("is_active", true)
      .single();

    if (mapping?.sku_id) {
      const { data: sku } = await supabase
        .from("sku_master")
        .select("cost_price")
        .eq("id", mapping.sku_id)
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
      .from("sales_channel_settings")
      .select("fee_rate")
      .eq("channel", channel)
      .single();
    return data?.fee_rate ? parseFloat(data.fee_rate) : 0;
  } catch {
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
// 프록시 서버 응답 형식:
// { orderId, orderDate, productOrder: { productOrderId, productName, productOption, quantity, unitPrice, totalPaymentAmount, productOrderStatus } }
function transformNaverOrder(raw: Record<string, unknown>): NaverOrder {
  const po = (raw.productOrder || raw) as Record<string, unknown>;

  return {
    orderId: String(raw.orderId || po.orderId || po.order_id || ""),
    productOrderId: po.productOrderId ? String(po.productOrderId) : undefined,
    orderDate: String(raw.orderDate || po.orderDate || po.order_date || po.paymentDate || ""),
    orderDatetime: (raw.orderDate || po.orderDatetime) ? String(raw.orderDate || po.orderDatetime) : undefined,
    productName: po.productName
      ? String(po.productName)
      : po.product_name
        ? String(po.product_name)
        : undefined,
    optionName: po.productOption
      ? String(po.productOption)
      : po.optionInfo
        ? String(po.optionInfo)
        : po.optionName || po.option_name
          ? String(po.optionName || po.option_name)
          : undefined,
    quantity: toNumber(po.quantity, 1),
    unitPrice: toNumber(po.unitPrice || po.unit_price || po.salePrice),
    totalPrice: toNumber(po.totalPaymentAmount || po.totalPrice || po.total_price),
    shippingFee: toNumber(po.deliveryFeeAmount || po.shippingFee || po.shipping_fee),
    discountAmount: toNumber(po.totalDiscountAmount || po.discountAmount || po.discount_amount),
    orderStatus: po.productOrderStatus
      ? String(po.productOrderStatus)
      : po.orderStatus
        ? String(po.orderStatus)
        : undefined,
    buyerName: po.ordererName
      ? String(po.ordererName)
      : po.buyerName
        ? String(po.buyerName)
        : undefined,
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
async function syncOrders(params: {
  channel: string;
  startDate: string;
  endDate: string;
}) {
  const { channel, startDate, endDate } = params;

  if (!startDate || !endDate) {
    return { success: false, error: "시작일과 종료일을 입력해주세요." };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: "날짜 형식이 올바르지 않습니다." };
  }

  if (start > end) {
    return { success: false, error: "시작일이 종료일보다 클 수 없습니다." };
  }

  console.log(`[commerce-proxy] Syncing ${channel} orders: ${startDate} ~ ${endDate}`);

  let rawOrders: Record<string, unknown>[] = [];

  if (channel === "smartstore") {
    try {
      // app_secrets에서 자격증명 읽기
      const { clientId, clientSecret } = await getNaverCredentials();

      // 프록시 서버의 /api/naver/sync 엔드포인트 호출
      // 프록시가 토큰 발급 + 주문 조회를 일괄 처리
      const response = await fetch(`${PROXY_URL}/api/naver/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-proxy-api-key": PROXY_API_KEY,
        },
        body: JSON.stringify({ clientId, clientSecret, startDate, endDate }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.message || "프록시 동기화 실패",
        };
      }

      // 프록시 서버가 반환한 주문 목록
      const orders = result.data?.orders || [];
      rawOrders = orders;
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
      message: "해당 기간에 주문이 없습니다.",
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

    const errors = validateOrder(order, i + 1);
    if (errors.length > 0) {
      allErrors.push(...errors);
      skippedCount++;
      continue;
    }

    const uniqueOrderId = order.productOrderId
      ? `${order.orderId}-${order.productOrderId}`
      : order.orderId;

    const { skuId, costPrice } = await matchSKU(channel, order.optionName);

    const totalPrice = order.totalPrice || order.unitPrice * order.quantity;
    const channelFee = Math.round(totalPrice * (feeRate / 100));
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;
    const totalCost = costPrice * order.quantity;
    const profit = totalPrice - totalCost - channelFee - shippingFee - discount;

    validOrders.push({
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
      currency: "KRW",
      exchange_rate: 1,
      raw_data: order.rawData || null,
    });
  }

  if (validOrders.length === 0) {
    return {
      success: false,
      error: "유효한 주문 데이터가 없습니다.",
      errors: allErrors,
    };
  }

  console.log(`[commerce-proxy] Upserting ${validOrders.length} orders to Supabase`);

  const { data, error: dbError } = await supabase
    .from("orders_raw")
    .upsert(validOrders, {
      onConflict: "channel,order_id",
      ignoreDuplicates: false,
    })
    .select("id");

  if (dbError) {
    console.error("[commerce-proxy] DB error:", dbError);
    return {
      success: false,
      error: `데이터 저장 오류: ${dbError.message}`,
      errors: allErrors,
    };
  }

  // 동기화 로그 기록
  try {
    await supabase.from("api_sync_logs").insert({
      channel,
      sync_type: "manual",
      status: "success",
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
      .from("sales_channel_settings")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: "success",
      })
      .eq("channel", channel);
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
const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const request: CommerceProxyRequest = JSON.parse(event.body || "{}");

    let proxyResponse;

    switch (request.action) {
      // ===== 프록시 패스스루 =====
      case "naver_token": {
        if (!request.clientId || !request.clientSecret) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: "clientId and clientSecret are required",
            }),
          };
        }

        // 프록시 서버의 /api/naver/test로 연결 테스트 (토큰 발급 검증)
        proxyResponse = await fetch(`${PROXY_URL}/api/naver/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-proxy-api-key": PROXY_API_KEY,
          },
          body: JSON.stringify({
            clientId: request.clientId,
            clientSecret: request.clientSecret,
          }),
        });

        const tokenData = await proxyResponse.json();
        return {
          statusCode: proxyResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(tokenData),
        };
      }

      case "naver_api": {
        if (!request.apiPath || !request.accessToken) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: "apiPath and accessToken are required",
            }),
          };
        }

        const queryString = request.query
          ? "?" + new URLSearchParams(request.query).toString()
          : "";

        // 네이버 커머스 API 직접 호출 (프록시를 통하지 않음)
        proxyResponse = await fetch(
          `https://api.commerce.naver.com/external/${request.apiPath}${queryString}`,
          {
            method: request.method || "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${request.accessToken}`,
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          }
        );

        const apiData = await proxyResponse.json();
        return {
          statusCode: proxyResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        };
      }

      case "proxy": {
        if (!request.url) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "url is required" }),
          };
        }

        proxyResponse = await fetch(`${PROXY_URL}/proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-proxy-api-key": PROXY_API_KEY,
          },
          body: JSON.stringify({
            url: request.url,
            method: request.method || "GET",
            headers: request.headers || {},
            body: request.body,
          }),
        });

        const proxyData = await proxyResponse.json();
        return {
          statusCode: proxyResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(proxyData),
        };
      }

      // ===== 주문 동기화 =====
      case "test-connection": {
        const result = await testConnection(request.channel || "smartstore");
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(result),
        };
      }

      case "sync-orders": {
        const result = await syncOrders({
          channel: request.channel || "smartstore",
          startDate: request.startDate || "",
          endDate: request.endDate || "",
        });
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(result),
        };
      }

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: "Invalid action" }),
        };
    }
  } catch (error) {
    console.error("[Commerce Proxy Error]", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};

export { handler };
