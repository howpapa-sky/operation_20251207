import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
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
  action:
    | "naver_token" | "naver_api" | "proxy"
    | "test-connection" | "sync-orders"
    | "cafe24-auth-url" | "cafe24-exchange-token" | "cafe24-init-oauth" | "cafe24-complete-oauth";
  // Brand (multi-brand support)
  brandId?: string;
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
  // Cafe24 OAuth
  mallId?: string;
  code?: string;
  redirectUri?: string;
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
async function getNaverCredentials(brandId?: string): Promise<{ clientId: string; clientSecret: string }> {
  // 브랜드별 자격증명이 api_credentials에 있으면 우선 사용
  if (brandId) {
    const { data: brandCreds } = await supabase
      .from("api_credentials")
      .select("naver_client_id, naver_client_secret")
      .eq("channel", "naver_smartstore")
      .eq("brand_id", brandId)
      .limit(1)
      .single();

    if (brandCreds?.naver_client_id && brandCreds?.naver_client_secret) {
      return {
        clientId: brandCreds.naver_client_id,
        clientSecret: brandCreds.naver_client_secret,
      };
    }
  }

  // 브랜드 미지정 또는 브랜드별 자격증명 없으면 api_credentials에서 첫 번째 조회
  const { data: creds } = await supabase
    .from("api_credentials")
    .select("naver_client_id, naver_client_secret")
    .eq("channel", "naver_smartstore")
    .limit(1)
    .single();

  if (creds?.naver_client_id && creds?.naver_client_secret) {
    return {
      clientId: creds.naver_client_id,
      clientSecret: creds.naver_client_secret,
    };
  }

  // 하위호환: app_secrets 테이블 폴백
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
    throw new Error("네이버 API 자격증명이 설정되지 않았습니다. 설정 > API 연동에서 등록해주세요.");
  }

  return {
    clientId: clientIdData.value,
    clientSecret: clientSecretData.value,
  };
}

// ========== 연결 테스트 ==========
async function testConnection(channel: string, brandId?: string) {
  if (channel === "smartstore") {
    try {
      const { clientId, clientSecret } = await getNaverCredentials(brandId);

      const response = await fetch(`${PROXY_URL}/api/naver/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PROXY_API_KEY,
        },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      const responseText = await response.text();
      console.log(`[commerce-proxy] test-connection proxy response: status=${response.status}, body=${responseText.substring(0, 300)}`);

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          message: `프록시 응답 파싱 실패 (status ${response.status}): ${responseText.substring(0, 100)}`,
        };
      }
      return {
        success: result.success === true,
        message: result.message || result.hint || (result.success ? "연결 성공" : result.error || "연결 실패"),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `연결 실패: ${error.message}`,
      };
    }
  }

  if (channel === "coupang") {
    try {
      const creds = await getCoupangCredentials(brandId);

      const response = await fetch(`${PROXY_URL}/api/coupang/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PROXY_API_KEY,
        },
        body: JSON.stringify({
          vendorId: creds.vendorId,
          accessKey: creds.accessKey,
          secretKey: creds.secretKey,
        }),
      });

      const responseText = await response.text();
      console.log(`[commerce-proxy] coupang test response: status=${response.status}, body=${responseText.substring(0, 300)}`);

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          message: `프록시 응답 파싱 실패 (status ${response.status}): ${responseText.substring(0, 100)}`,
        };
      }
      return {
        success: result.success === true,
        message: result.message || (result.success ? "연결 성공" : result.error || "연결 실패"),
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

// ========== SKU 일괄 매칭 (N*2 쿼리 → 2 쿼리) ==========
async function loadSKULookup(channel: string): Promise<{
  match: (optionName: string | undefined) => { skuId: string | null; costPrice: number };
}> {
  // 1) 채널의 모든 옵션 매핑을 한 번에 조회
  const optionMap = new Map<string, string>(); // optionName → skuId
  try {
    const { data: mappings } = await supabase
      .from("channel_option_mapping")
      .select("option_name, sku_id")
      .eq("channel", channel)
      .eq("is_active", true);

    if (mappings) {
      for (const m of mappings) {
        optionMap.set(m.option_name, m.sku_id);
      }
    }
  } catch { /* 매핑 테이블 미존재 시 무시 */ }

  // 2) 필요한 SKU의 원가를 한 번에 조회
  const skuCostMap = new Map<string, number>(); // skuId → costPrice
  const skuIds = [...new Set(optionMap.values())];
  if (skuIds.length > 0) {
    try {
      const { data: skus } = await supabase
        .from("sku_master")
        .select("id, cost_price")
        .in("id", skuIds);

      if (skus) {
        for (const s of skus) {
          skuCostMap.set(s.id, s.cost_price ? parseFloat(s.cost_price) : 0);
        }
      }
    } catch { /* SKU 테이블 미존재 시 무시 */ }
  }

  return {
    match(optionName) {
      if (!optionName) return { skuId: null, costPrice: 0 };
      const skuId = optionMap.get(optionName) || null;
      const costPrice = skuId ? (skuCostMap.get(skuId) || 0) : 0;
      return { skuId, costPrice };
    },
  };
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
  brandId?: string;
}) {
  const { channel, startDate, endDate, brandId } = params;

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
      const { clientId, clientSecret } = await getNaverCredentials(brandId);

      // NCP 프록시 서버의 /api/naver/sync 엔드포인트 호출
      // 프록시가 토큰 발급 + 변경주문 조회 + 상세조회를 일괄 처리
      const response = await fetch(`${PROXY_URL}/api/naver/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PROXY_API_KEY,
        },
        body: JSON.stringify({ clientId, clientSecret, startDate, endDate }),
      });

      const responseText = await response.text();
      console.log(`[commerce-proxy] sync proxy response: status=${response.status}, body=${responseText.substring(0, 500)}`);

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: `프록시 응답 파싱 실패 (status ${response.status}): ${responseText.substring(0, 200)}`,
        };
      }

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.message || result.hint || result.error || "프록시 동기화 실패",
        };
      }

      rawOrders = result.data?.orders || [];
    } catch (error: any) {
      return {
        success: false,
        error: `스마트스토어 주문 조회 실패: ${error.message}`,
      };
    }
  } else if (channel === "coupang") {
    // 쿠팡은 별도 syncCoupangOrders에서 전체 처리
    return await syncCoupangOrders({ startDate, endDate, brandId });
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

  // 수수료율 + SKU 룩업을 동시에 조회 (병렬)
  const [feeRate, skuLookup] = await Promise.all([
    getChannelFeeRate(channel),
    loadSKULookup(channel),
  ]);

  // 주문 데이터 변환 및 검증 (DB 호출 없이 인메모리 처리)
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

    // 인메모리 매칭 (DB 호출 없음)
    const { skuId, costPrice } = skuLookup.match(order.optionName);

    const totalPrice = order.totalPrice || order.unitPrice * order.quantity;
    const channelFee = Math.round(totalPrice * (feeRate / 100));
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;
    const totalCost = costPrice * order.quantity;
    const profit = totalPrice - totalCost - channelFee - shippingFee - discount;

    validOrders.push({
      channel,
      brand_id: brandId || null,
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

  // 동일 channel+order_id 중복 제거 (마지막 항목 유지)
  const deduped = new Map<string, (typeof validOrders)[number]>();
  for (const order of validOrders) {
    const key = `${order.channel}::${order.order_id}`;
    deduped.set(key, order);
  }
  const uniqueOrders = Array.from(deduped.values());
  const duplicateCount = validOrders.length - uniqueOrders.length;

  if (duplicateCount > 0) {
    console.log(`[commerce-proxy] Removed ${duplicateCount} duplicate orders`);
  }

  // Supabase에 upsert (병렬 청크 처리)
  const CHUNK_SIZE = 200;
  console.log(`[commerce-proxy] Upserting ${uniqueOrders.length} orders in chunks of ${CHUNK_SIZE}`);

  const chunks: (typeof uniqueOrders)[] = [];
  for (let i = 0; i < uniqueOrders.length; i += CHUNK_SIZE) {
    chunks.push(uniqueOrders.slice(i, i + CHUNK_SIZE));
  }

  const upsertResults = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("orders_raw")
        .upsert(chunk, {
          onConflict: "channel,order_id",
          ignoreDuplicates: false,
        })
        .select("id")
    )
  );

  // 결과 합산 및 에러 확인
  const dbErrors = upsertResults.filter((r) => r.error);
  if (dbErrors.length > 0) {
    const firstError = dbErrors[0].error!;
    console.error("[commerce-proxy] DB error:", firstError);
    return {
      success: false,
      error: `데이터 저장 오류: ${firstError.message}`,
      errors: allErrors,
    };
  }

  const totalInserted = upsertResults.reduce(
    (sum, r) => sum + (r.data?.length || 0),
    0
  );

  // 동기화 로그 기록
  try {
    await supabase.from("api_sync_logs").insert({
      channel,
      sync_type: "manual",
      status: "success",
      records_fetched: rawOrders.length,
      records_created: totalInserted || uniqueOrders.length,
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
    message: `${uniqueOrders.length}건의 주문이 동기화되었습니다.${duplicateCount > 0 ? ` (중복 ${duplicateCount}건 제거)` : ''}`,
    synced: totalInserted || uniqueOrders.length,
    skipped: skippedCount,
    duplicates: duplicateCount,
    total: rawOrders.length,
    errors: allErrors,
  };
}

// ========== Cafe24 API ==========

// Cafe24 자격증명 조회
async function getCafe24Credentials(brandId?: string): Promise<{
  mallId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}> {
  // 브랜드별 자격증명 우선 조회
  let query = supabase
    .from("api_credentials")
    .select("cafe24_mall_id, cafe24_client_id, cafe24_client_secret, cafe24_access_token, cafe24_refresh_token")
    .eq("channel", "cafe24");

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data } = await query.limit(1).single();

  if (!data?.cafe24_mall_id || !data?.cafe24_client_id || !data?.cafe24_client_secret) {
    throw new Error("Cafe24 자격증명이 설정되지 않았습니다. 설정 > API 연동에서 등록해주세요.");
  }

  return {
    mallId: data.cafe24_mall_id,
    clientId: data.cafe24_client_id,
    clientSecret: data.cafe24_client_secret,
    accessToken: data.cafe24_access_token || undefined,
    refreshToken: data.cafe24_refresh_token || undefined,
  };
}

// Cafe24 OAuth 인증 URL 생성
// scope은 개발자센터 권한관리에 등록된 항목과 일치해야 함
function getCafe24AuthUrl(mallId: string, clientId: string, redirectUri: string): string {
  const scope = [
    "mall.read_application", "mall.write_application",
    "mall.read_category", "mall.read_product", "mall.read_personal",
    "mall.read_order", "mall.read_community", "mall.read_store",
    "mall.read_salesreport", "mall.read_shipping", "mall.read_analytics",
  ].join(",");
  return `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=cafe24auth`;
}

// Cafe24 토큰 교환 (authorization_code → access_token)
async function exchangeCafe24Token(
  mallId: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Cafe24 토큰 교환 실패");
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

// Cafe24 토큰 갱신
async function refreshCafe24Token(
  mallId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Cafe24 토큰 갱신 실패");
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt,
  };
}

// Cafe24 토큰 확보 (저장된 토큰 사용, 만료 시 갱신)
async function ensureCafe24Token(creds: {
  mallId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}, brandId?: string): Promise<string> {
  if (!creds.accessToken || !creds.refreshToken) {
    throw new Error("Cafe24 인증이 필요합니다. 설정에서 OAuth 인증을 진행해주세요.");
  }

  // 토큰 갱신 시도 (만료 여부와 관계없이 안전하게)
  try {
    // 토큰이 유효한지 간단히 테스트
    const testRes = await fetch(`https://${creds.mallId}.cafe24api.com/api/v2/admin/store`, {
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
    });

    if (testRes.ok) return creds.accessToken;
  } catch { /* 토큰 만료 → 갱신 */ }

  // 토큰 갱신
  console.log("[cafe24] Refreshing token...");
  const newTokens = await refreshCafe24Token(
    creds.mallId, creds.clientId, creds.clientSecret, creds.refreshToken
  );

  // DB에 새 토큰 저장 (브랜드별 필터링)
  let updateQuery = supabase
    .from("api_credentials")
    .update({
      cafe24_access_token: newTokens.accessToken,
      cafe24_refresh_token: newTokens.refreshToken,
      cafe24_token_expires_at: newTokens.expiresAt,
    })
    .eq("channel", "cafe24");

  if (brandId) {
    updateQuery = updateQuery.eq("brand_id", brandId);
  }

  await updateQuery;

  return newTokens.accessToken;
}

// Cafe24 주문 조회 - Netlify에서 직접 호출 (IP 제한 없음)
async function fetchCafe24Orders(
  mallId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  console.log(`[cafe24] Fetching orders: ${startDate} ~ ${endDate}`);

  const allOrders: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 100;
  let useEmbed = true;

  while (true) {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      limit: String(limit),
      offset: String(offset),
    });
    if (useEmbed) params.set("embed", "items");

    const url = `https://${mallId}.cafe24api.com/api/v2/admin/orders?${params}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2025-12-01",
      },
    });

    // embed=items로 400이면 embed 제거 후 재시도
    if (response.status === 400 && useEmbed && offset === 0) {
      const errBody = await response.text();
      console.warn(`[cafe24] 400 with embed=items, retrying without. Error: ${errBody}`);
      useEmbed = false;
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let detail = "";
      try {
        const errJson = JSON.parse(errorText);
        detail = errJson.error?.message || errJson.error?.code || errJson.message || errorText;
      } catch {
        detail = errorText.substring(0, 300);
      }
      throw new Error(`Cafe24 API 오류: ${response.status} - ${detail}`);
    }

    const data = await response.json();
    const orders = (data.orders || []) as Record<string, unknown>[];

    if (orders.length === 0) break;

    allOrders.push(...orders);
    offset += limit;

    console.log(`[cafe24] page offset=${offset}, got=${orders.length}, total=${allOrders.length}`);

    // 안전 장치: Netlify 타임아웃 방지 (최대 500건)
    if (offset >= 500) break;
  }

  console.log(`[cafe24] Complete: ${allOrders.length} orders`);
  return allOrders;
}

// Cafe24 주문 → orders_raw 변환
function transformCafe24Order(raw: Record<string, unknown>): NaverOrder[] {
  const orderId = String(raw.order_id || "");
  const orderDate = String(raw.order_date || raw.payment_date || "");
  const buyerName = String((raw as any).buyer_name || (raw as any).billing_name || "");
  const buyerPhone = String((raw as any).buyer_cellphone || (raw as any).buyer_phone || "");

  // Cafe24는 주문 내 여러 상품이 items 배열로 들어옴
  const items = (raw.items || raw.order_items || []) as Record<string, unknown>[];

  if (items.length === 0) {
    // items가 없으면 주문 단위로 처리
    return [{
      orderId,
      orderDate,
      productName: String(raw.product_name || ""),
      quantity: toNumber(raw.quantity, 1),
      unitPrice: toNumber(raw.product_price || raw.selling_price),
      totalPrice: toNumber(raw.actual_payment_amount || raw.order_price_amount),
      shippingFee: toNumber(raw.shipping_fee),
      discountAmount: toNumber(raw.total_discount_amount || raw.discount_amount),
      orderStatus: String(raw.order_status || ""),
      buyerName,
      buyerPhone,
      rawData: raw,
    }];
  }

  // 상품 단위로 분리
  return items.map((item) => ({
    orderId,
    productOrderId: String(item.order_item_code || item.item_no || ""),
    orderDate,
    productName: String(item.product_name || item.product_code || ""),
    optionName: String(item.option_value || item.option_id || "") || undefined,
    quantity: toNumber(item.quantity, 1),
    unitPrice: toNumber(item.product_price || item.selling_price),
    totalPrice: toNumber(item.actual_payment_amount || item.payment_amount)
      || toNumber(item.product_price || item.selling_price) * toNumber(item.quantity, 1),
    shippingFee: 0, // 배송비는 주문 단위
    discountAmount: toNumber(item.discount_amount || item.additional_discount_price),
    orderStatus: String(item.order_status || raw.order_status || ""),
    buyerName,
    buyerPhone,
    rawData: raw,
  }));
}

// Cafe24 주문 동기화
async function syncCafe24Orders(params: { startDate: string; endDate: string; brandId?: string }) {
  const { startDate, endDate, brandId } = params;
  const channel = "cafe24";

  console.log(`[cafe24] Syncing orders: ${startDate} ~ ${endDate} (brand: ${brandId || 'default'})`);

  // 자격증명 조회 + 토큰 확보
  let creds;
  try {
    creds = await getCafe24Credentials(brandId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  let accessToken: string;
  try {
    accessToken = await ensureCafe24Token(creds, brandId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  // 주문 데이터 가져오기 (프론트엔드에서 날짜 분할하여 호출)
  let rawOrders: Record<string, unknown>[];
  try {
    rawOrders = await fetchCafe24Orders(creds.mallId, accessToken, startDate, endDate);
  } catch (error: any) {
    return { success: false, error: `Cafe24 주문 조회 실패: ${error.message}` };
  }

  if (rawOrders.length === 0) {
    return { success: true, message: "해당 기간에 주문이 없습니다.", synced: 0, skipped: 0, errors: [] };
  }

  console.log(`[cafe24] Fetched ${rawOrders.length} orders`);

  // 수수료율 + SKU 룩업 병렬 조회
  const [feeRate, skuLookup] = await Promise.all([
    getChannelFeeRate(channel),
    loadSKULookup(channel),
  ]);

  // 주문 데이터 변환 (Cafe24는 1주문 → 다상품이므로 flat 처리)
  const validOrders: any[] = [];
  const allErrors: string[] = [];
  let skippedCount = 0;
  let rowIndex = 0;

  for (const raw of rawOrders) {
    const orderItems = transformCafe24Order(raw);

    // 주문 전체 배송비를 첫 상품에 할당
    const orderShippingFee = toNumber((raw as any).shipping_fee);

    for (let j = 0; j < orderItems.length; j++) {
      rowIndex++;
      const order = orderItems[j];

      const errors = validateOrder(order, rowIndex);
      if (errors.length > 0) {
        allErrors.push(...errors);
        skippedCount++;
        continue;
      }

      const uniqueOrderId = order.productOrderId
        ? `${order.orderId}-${order.productOrderId}`
        : order.orderId;

      const { skuId, costPrice } = skuLookup.match(order.optionName);

      const totalPrice = order.totalPrice || order.unitPrice * order.quantity;
      const channelFee = Math.round(totalPrice * (feeRate / 100));
      const shippingFee = j === 0 ? orderShippingFee : 0;
      const discount = order.discountAmount || 0;
      const totalCost = costPrice * order.quantity;
      const profit = totalPrice - totalCost - channelFee - shippingFee - discount;

      validOrders.push({
        channel,
        brand_id: brandId || null,
        order_id: uniqueOrderId,
        order_date: toDateStr(order.orderDate),
        order_datetime: null,
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
        shipping_address: null,
        currency: "KRW",
        exchange_rate: 1,
        raw_data: order.rawData || null,
      });
    }
  }

  if (validOrders.length === 0) {
    return { success: false, error: "유효한 주문 데이터가 없습니다.", errors: allErrors };
  }

  // 중복 제거
  const deduped = new Map<string, (typeof validOrders)[number]>();
  for (const order of validOrders) {
    deduped.set(`${order.channel}::${order.order_id}`, order);
  }
  const uniqueOrders = Array.from(deduped.values());
  const duplicateCount = validOrders.length - uniqueOrders.length;

  // 병렬 청크 upsert
  const CHUNK_SIZE = 200;
  console.log(`[cafe24] Upserting ${uniqueOrders.length} orders`);

  const chunks: (typeof uniqueOrders)[] = [];
  for (let i = 0; i < uniqueOrders.length; i += CHUNK_SIZE) {
    chunks.push(uniqueOrders.slice(i, i + CHUNK_SIZE));
  }

  const upsertResults = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("orders_raw").upsert(chunk, { onConflict: "channel,order_id", ignoreDuplicates: false }).select("id")
    )
  );

  const dbErrors = upsertResults.filter((r) => r.error);
  if (dbErrors.length > 0) {
    return { success: false, error: `데이터 저장 오류: ${dbErrors[0].error!.message}`, errors: allErrors };
  }

  const totalInserted = upsertResults.reduce((sum, r) => sum + (r.data?.length || 0), 0);

  // 로그 및 설정 업데이트
  try {
    await supabase.from("api_sync_logs").insert({
      channel, sync_type: "manual", status: "success",
      records_fetched: rawOrders.length, records_created: totalInserted || uniqueOrders.length,
      records_updated: 0, started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    });
  } catch { /* 무시 */ }

  try {
    await supabase.from("sales_channel_settings")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success" })
      .eq("channel", channel);
  } catch { /* 무시 */ }

  return {
    success: true,
    message: `${uniqueOrders.length}건의 Cafe24 주문이 동기화되었습니다.${duplicateCount > 0 ? ` (중복 ${duplicateCount}건 제거)` : ""}`,
    synced: totalInserted || uniqueOrders.length,
    skipped: skippedCount,
    duplicates: duplicateCount,
    total: rawOrders.length,
    errors: allErrors,
  };
}

// ========== Coupang API ==========

// Coupang 자격증명 조회
async function getCoupangCredentials(brandId?: string): Promise<{
  vendorId: string;
  accessKey: string;
  secretKey: string;
}> {
  let query = supabase
    .from("api_credentials")
    .select("coupang_vendor_id, coupang_access_key, coupang_secret_key")
    .eq("channel", "coupang");

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data } = await query.limit(1).single();

  if (!data?.coupang_vendor_id || !data?.coupang_access_key || !data?.coupang_secret_key) {
    throw new Error("쿠팡 자격증명이 설정되지 않았습니다. 설정 > API 연동에서 Vendor ID, Access Key, Secret Key를 등록해주세요.");
  }

  return {
    vendorId: data.coupang_vendor_id,
    accessKey: data.coupang_access_key,
    secretKey: data.coupang_secret_key,
  };
}

// Coupang 주문 → orders_raw 변환
interface CoupangOrderItem {
  vendorItemId?: number;
  vendorItemName?: string;
  sellerProductItemName?: string;
  firstSellerProductItemName?: string;
  externalVendorSkuCode?: string;
  shippingCount?: number;
  salesPrice?: number;
  orderPrice?: number;
  discountPrice?: number;
  instantCouponDiscount?: number;
  downloadableCouponDiscount?: number;
  coupangDiscount?: number;
}

function transformCoupangOrder(raw: Record<string, unknown>): NaverOrder[] {
  const shipmentBoxId = String(raw.shipmentBoxId || "");
  const orderId = String(raw.orderId || "");
  const orderedAt = String(raw.orderedAt || "");
  const status = String(raw.status || "");
  const shippingPrice = toNumber(raw.shippingPrice);

  const orderer = (raw.orderer || {}) as Record<string, unknown>;
  const receiver = (raw.receiver || {}) as Record<string, unknown>;
  const buyerName = String(orderer.name || "");
  const buyerPhone = String(orderer.phone || orderer.safeNumber || "");
  const shippingAddr = [
    String(receiver.addr1 || ""),
    String(receiver.addr2 || ""),
  ].filter(Boolean).join(" ");

  const items = (raw.orderItems || []) as CoupangOrderItem[];

  if (items.length === 0) {
    return [{
      orderId: shipmentBoxId || orderId,
      orderDate: orderedAt,
      productName: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      shippingFee: shippingPrice,
      discountAmount: 0,
      orderStatus: status,
      buyerName,
      buyerPhone,
      shippingAddress: shippingAddr,
      rawData: raw,
    }];
  }

  return items.map((item, idx) => {
    const salesPrice = toNumber(item.salesPrice);
    const quantity = toNumber(item.shippingCount, 1);
    const discount = toNumber(item.discountPrice)
      + toNumber(item.instantCouponDiscount)
      + toNumber(item.downloadableCouponDiscount)
      + toNumber(item.coupangDiscount);
    const totalPrice = toNumber(item.orderPrice) || (salesPrice * quantity);

    return {
      orderId: shipmentBoxId || orderId,
      productOrderId: String(item.vendorItemId || idx),
      orderDate: orderedAt,
      productName: String(item.vendorItemName || ""),
      optionName: String(item.sellerProductItemName || item.firstSellerProductItemName || "") || undefined,
      quantity,
      unitPrice: salesPrice,
      totalPrice,
      shippingFee: idx === 0 ? shippingPrice : 0,
      discountAmount: discount,
      orderStatus: status,
      buyerName,
      buyerPhone,
      shippingAddress: shippingAddr,
      rawData: raw,
    };
  });
}

// Coupang 주문 동기화
async function syncCoupangOrders(params: { startDate: string; endDate: string; brandId?: string }) {
  const { startDate, endDate, brandId } = params;
  const channel = "coupang";

  console.log(`[coupang] Syncing orders: ${startDate} ~ ${endDate} (brand: ${brandId || 'default'})`);

  // 자격증명 조회
  let creds;
  try {
    creds = await getCoupangCredentials(brandId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  // NCP 프록시 서버 경유 (쿠팡 API IP 제한으로 고정 IP 필요)
  let rawOrders: Record<string, unknown>[];
  try {
    const response = await fetch(`${PROXY_URL}/api/coupang/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PROXY_API_KEY,
      },
      body: JSON.stringify({
        vendorId: creds.vendorId,
        accessKey: creds.accessKey,
        secretKey: creds.secretKey,
        startDate,
        endDate,
      }),
    });

    const responseText = await response.text();
    console.log(`[commerce-proxy] coupang sync response: status=${response.status}, body=${responseText.substring(0, 500)}`);

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: `프록시 응답 파싱 실패 (status ${response.status}): ${responseText.substring(0, 200)}`,
      };
    }

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.message || result.error || "쿠팡 프록시 동기화 실패",
      };
    }

    rawOrders = result.data?.orders || [];
  } catch (error: any) {
    return {
      success: false,
      error: `쿠팡 주문 조회 실패: ${error.message}`,
    };
  }

  if (rawOrders.length === 0) {
    return { success: true, message: "해당 기간에 주문이 없습니다.", synced: 0, skipped: 0, errors: [] };
  }

  console.log(`[coupang] Fetched ${rawOrders.length} orders`);

  // 수수료율 + SKU 룩업 병렬 조회
  const [feeRate, skuLookup] = await Promise.all([
    getChannelFeeRate(channel),
    loadSKULookup(channel),
  ]);

  // 주문 데이터 변환 (1주문 → 다상품 flat 처리)
  const validOrders: any[] = [];
  const allErrors: string[] = [];
  let skippedCount = 0;
  let rowIndex = 0;

  for (const raw of rawOrders) {
    const orderItems = transformCoupangOrder(raw);

    for (let j = 0; j < orderItems.length; j++) {
      rowIndex++;
      const order = orderItems[j];

      const errors = validateOrder(order, rowIndex);
      if (errors.length > 0) {
        allErrors.push(...errors);
        skippedCount++;
        continue;
      }

      const uniqueOrderId = order.productOrderId
        ? `${order.orderId}-${order.productOrderId}`
        : order.orderId;

      const { skuId, costPrice } = skuLookup.match(order.optionName);

      const totalPrice = order.totalPrice || order.unitPrice * order.quantity;
      const channelFee = Math.round(totalPrice * (feeRate / 100));
      const shippingFee = order.shippingFee || 0;
      const discount = order.discountAmount || 0;
      const totalCost = costPrice * order.quantity;
      const profit = totalPrice - totalCost - channelFee - shippingFee - discount;

      validOrders.push({
        channel,
        brand_id: brandId || null,
        order_id: uniqueOrderId,
        order_date: toDateStr(order.orderDate),
        order_datetime: order.orderDate || null,
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
  }

  if (validOrders.length === 0) {
    return { success: false, error: "유효한 주문 데이터가 없습니다.", errors: allErrors };
  }

  // 중복 제거
  const deduped = new Map<string, (typeof validOrders)[number]>();
  for (const order of validOrders) {
    deduped.set(`${order.channel}::${order.order_id}`, order);
  }
  const uniqueOrders = Array.from(deduped.values());
  const duplicateCount = validOrders.length - uniqueOrders.length;

  // 병렬 청크 upsert
  const CHUNK_SIZE = 200;
  console.log(`[coupang] Upserting ${uniqueOrders.length} orders`);

  const chunks: (typeof uniqueOrders)[] = [];
  for (let i = 0; i < uniqueOrders.length; i += CHUNK_SIZE) {
    chunks.push(uniqueOrders.slice(i, i + CHUNK_SIZE));
  }

  const upsertResults = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("orders_raw").upsert(chunk, { onConflict: "channel,order_id", ignoreDuplicates: false }).select("id")
    )
  );

  const dbErrors = upsertResults.filter((r) => r.error);
  if (dbErrors.length > 0) {
    return { success: false, error: `데이터 저장 오류: ${dbErrors[0].error!.message}`, errors: allErrors };
  }

  const totalInserted = upsertResults.reduce((sum, r) => sum + (r.data?.length || 0), 0);

  // 로그 및 설정 업데이트
  try {
    await supabase.from("api_sync_logs").insert({
      channel, sync_type: "manual", status: "success",
      records_fetched: rawOrders.length, records_created: totalInserted || uniqueOrders.length,
      records_updated: 0, started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    });
  } catch { /* 무시 */ }

  try {
    await supabase.from("sales_channel_settings")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success" })
      .eq("channel", channel);
  } catch { /* 무시 */ }

  return {
    success: true,
    message: `${uniqueOrders.length}건의 쿠팡 주문이 동기화되었습니다.${duplicateCount > 0 ? ` (중복 ${duplicateCount}건 제거)` : ""}`,
    synced: totalInserted || uniqueOrders.length,
    skipped: skippedCount,
    duplicates: duplicateCount,
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

        proxyResponse = await fetch(`${PROXY_URL}/naver/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": PROXY_API_KEY,
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
            "x-api-key": PROXY_API_KEY,
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

      // ===== Cafe24 OAuth =====
      case "cafe24-init-oauth": {
        // DB에서 자격증명을 읽어 OAuth URL 생성 (테스트 실행 등에서 사용)
        const redirectUri = request.redirectUri;
        if (!redirectUri) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "redirectUri is required" }),
          };
        }
        try {
          const creds = await getCafe24Credentials(request.brandId);
          const authUrl = getCafe24AuthUrl(creds.mallId, creds.clientId, redirectUri);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, authUrl }),
          };
        } catch (error: any) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, error: error.message }),
          };
        }
      }

      case "cafe24-auth-url": {
        if (!request.mallId || !request.clientId || !request.redirectUri) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "mallId, clientId, redirectUri are required" }),
          };
        }
        const authUrl = getCafe24AuthUrl(request.mallId, request.clientId, request.redirectUri);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, authUrl }),
        };
      }

      case "cafe24-exchange-token": {
        if (!request.mallId || !request.clientId || !request.clientSecret || !request.code || !request.redirectUri) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "mallId, clientId, clientSecret, code, redirectUri are required" }),
          };
        }
        try {
          const tokens = await exchangeCafe24Token(
            request.mallId, request.clientId, request.clientSecret, request.code, request.redirectUri
          );
          // DB에 토큰 저장 (브랜드별 필터링)
          let exchangeQuery = supabase
            .from("api_credentials")
            .update({
              cafe24_access_token: tokens.accessToken,
              cafe24_refresh_token: tokens.refreshToken,
              cafe24_token_expires_at: tokens.expiresAt,
            })
            .eq("channel", "cafe24");

          if (request.brandId) {
            exchangeQuery = exchangeQuery.eq("brand_id", request.brandId);
          }

          await exchangeQuery;

          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: "Cafe24 인증이 완료되었습니다." }),
          };
        } catch (error: any) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, error: error.message }),
          };
        }
      }

      case "cafe24-complete-oauth": {
        // DB에서 자격증명을 읽고, code로 토큰 교환까지 서버에서 완료 (프론트 로그인 불필요)
        if (!request.code || !request.redirectUri) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "code and redirectUri are required" }),
          };
        }
        try {
          const creds = await getCafe24Credentials(request.brandId);
          const tokens = await exchangeCafe24Token(
            creds.mallId, creds.clientId, creds.clientSecret, request.code, request.redirectUri
          );
          // DB에 토큰 저장 (브랜드별 필터링)
          let completeQuery = supabase
            .from("api_credentials")
            .update({
              cafe24_access_token: tokens.accessToken,
              cafe24_refresh_token: tokens.refreshToken,
              cafe24_token_expires_at: tokens.expiresAt,
            })
            .eq("channel", "cafe24");

          if (request.brandId) {
            completeQuery = completeQuery.eq("brand_id", request.brandId);
          }

          await completeQuery;

          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: "Cafe24 인증이 완료되었습니다." }),
          };
        } catch (error: any) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, error: error.message }),
          };
        }
      }

      // ===== 주문 동기화 =====
      case "test-connection": {
        const ch = request.channel || "smartstore";

        if (ch === "coupang") {
          try {
            const coupangCreds = await getCoupangCredentials(request.brandId);

            const coupangTestRes = await fetch(`${PROXY_URL}/api/coupang/test`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": PROXY_API_KEY,
              },
              body: JSON.stringify({
                vendorId: coupangCreds.vendorId,
                accessKey: coupangCreds.accessKey,
                secretKey: coupangCreds.secretKey,
              }),
            });

            const coupangTestText = await coupangTestRes.text();
            let coupangTestResult: any;
            try {
              coupangTestResult = JSON.parse(coupangTestText);
            } catch {
              return {
                statusCode: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, message: `프록시 응답 파싱 실패: ${coupangTestText.substring(0, 100)}` }),
              };
            }

            return {
              statusCode: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: coupangTestResult.success === true,
                message: coupangTestResult.message || (coupangTestResult.success ? "연결 성공" : "연결 실패"),
              }),
            };
          } catch (error: any) {
            return {
              statusCode: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, message: `연결 실패: ${error.message}` }),
            };
          }
        }

        if (ch === "cafe24") {
          try {
            const creds = await getCafe24Credentials(request.brandId);
            const token = await ensureCafe24Token(creds, request.brandId);
            // Cafe24 API 직접 호출 (IP 제한 없음)
            const testRes = await fetch(
              `https://${creds.mallId}.cafe24api.com/api/v2/admin/store`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "X-Cafe24-Api-Version": "2025-12-01",
                },
              }
            );
            if (testRes.ok) {
              return {
                statusCode: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ success: true, message: "Cafe24 API 연결 성공!" }),
              };
            }
            const errText = await testRes.text();
            return {
              statusCode: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, message: `Cafe24 API 응답 오류 (${testRes.status})` }),
            };
          } catch (error: any) {
            return {
              statusCode: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, message: error.message }),
            };
          }
        }

        const result = await testConnection(ch, request.brandId);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(result),
        };
      }

      case "sync-orders": {
        const syncChannel = request.channel || "smartstore";

        if (syncChannel === "cafe24") {
          const cafe24Result = await syncCafe24Orders({
            startDate: request.startDate || "",
            endDate: request.endDate || "",
            brandId: request.brandId,
          });
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(cafe24Result),
          };
        }

        if (syncChannel === "coupang") {
          const coupangResult = await syncCoupangOrders({
            startDate: request.startDate || "",
            endDate: request.endDate || "",
            brandId: request.brandId,
          });
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(coupangResult),
          };
        }

        const result = await syncOrders({
          channel: syncChannel,
          startDate: request.startDate || "",
          endDate: request.endDate || "",
          brandId: request.brandId,
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
