const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3100;
const API_KEY = process.env.PROXY_API_KEY || '';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// API Key authentication middleware (x-api-key, x-proxy-api-key 모두 허용)
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-proxy-api-key'];
  const headerUsed = req.headers['x-api-key'] ? 'x-api-key' : (req.headers['x-proxy-api-key'] ? 'x-proxy-api-key' : 'none');

  if (!apiKey || apiKey !== API_KEY) {
    console.log(`[AUTH FAIL] ${req.method} ${req.path} | header: ${headerUsed} | received_len: ${apiKey ? apiKey.length : 0} | expected_len: ${API_KEY ? API_KEY.length : 0}`);
    return res.status(401).json({
      error: 'Unauthorized',
      hint: !API_KEY ? 'PROXY_API_KEY 환경변수가 설정되지 않았습니다' :
            !apiKey ? '인증 헤더가 없습니다 (x-api-key 또는 x-proxy-api-key)' :
            'API 키가 일치하지 않습니다'
    });
  }
  next();
}

// Health check (no auth required) + 설정 상태 확인
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      apiKeyConfigured: !!API_KEY,
      apiKeyLength: API_KEY ? API_KEY.length : 0,
    }
  });
});

// ==========================================
// Naver Commerce API endpoints
// ==========================================

// 토큰 발급 헬퍼 (내부 재사용)
async function generateNaverToken(clientId, clientSecret) {
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const hashedSign = bcrypt.hashSync(password, clientSecret);
  const clientSecretSign = Buffer.from(hashedSign, 'utf-8').toString('utf-8');

  const params = new URLSearchParams({
    client_id: clientId,
    timestamp: timestamp.toString(),
    client_secret_sign: clientSecretSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.message || data.error || 'Token request failed');
  }
  return data;
}

// Generate Naver Commerce API token
app.post('/naver/token', authenticate, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'clientId and clientSecret are required' });
    }

    const data = await generateNaverToken(clientId, clientSecret);
    res.json({
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (error) {
    console.error('[Naver Token Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 연결 테스트 (토큰 발급으로 검증)
app.post('/api/naver/test', authenticate, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: 'clientId and clientSecret are required' });
    }

    await generateNaverToken(clientId, clientSecret);
    res.json({ success: true, message: '네이버 스마트스토어 API 연결 성공!' });
  } catch (error) {
    console.error('[Naver Test Error]', error.message);
    res.json({ success: false, message: `연결 실패: ${error.message}` });
  }
});

// 주문 동기화 (토큰 발급 → 변경주문 조회 → 상세 조회)
app.post('/api/naver/sync', authenticate, async (req, res) => {
  try {
    const { clientId, clientSecret, startDate, endDate } = req.body;

    if (!clientId || !clientSecret || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'clientId, clientSecret, startDate, endDate are required' });
    }

    console.log(`[naver-sync] ${startDate} ~ ${endDate}`);

    // 1. 토큰 발급
    const tokenData = await generateNaverToken(clientId, clientSecret);
    const accessToken = tokenData.access_token;

    // 2. 변경된 주문 ID 조회
    const lastChangedFrom = `${startDate}T00:00:00.000+09:00`;
    const lastChangedTo = `${endDate}T23:59:59.999+09:00`;
    const allIds = [];
    let moreSequence = null;

    while (true) {
      const params = new URLSearchParams({ lastChangedFrom, lastChangedTo });
      if (moreSequence) params.set('moreSequence', moreSequence);

      const url = `https://api.commerce.naver.com/external/v1/pay-order/seller/orders/last-changed-statuses?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.json({
          success: false,
          message: `주문 조회 실패 (${response.status}): ${err.message || JSON.stringify(err)}`,
        });
      }

      const data = await response.json();
      const statuses = data.data?.lastChangeStatuses || [];
      if (statuses.length === 0) break;

      allIds.push(...statuses.map(s => s.productOrderId));
      moreSequence = data.data?.moreSequence || null;
      if (!moreSequence) break;
    }

    console.log(`[naver-sync] Found ${allIds.length} product order IDs`);

    if (allIds.length === 0) {
      return res.json({ success: true, data: { orders: [] } });
    }

    // 3. 주문 상세 조회 (300건씩 배치)
    const orders = [];
    const BATCH_SIZE = 300;

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
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
        console.error(`[naver-sync] Details batch ${i} failed: ${response.status}`);
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
            deliveryFeeAmount: po.productOrder?.deliveryFeeAmount || 0,
            totalDiscountAmount: po.productOrder?.totalDiscountAmount || 0,
          },
          ordererName: po.order?.ordererName || '',
          ordererTel: po.order?.ordererTel || '',
        });
      }
    }

    console.log(`[naver-sync] Complete: ${orders.length} orders`);

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('[Naver Sync Error]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generic Naver Commerce API proxy
app.all('/naver/api/*', authenticate, async (req, res) => {
  try {
    const apiPath = req.params[0]; // everything after /naver/api/
    const targetUrl = `https://api.commerce.naver.com/external/${apiPath}`;

    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward Authorization header
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'];
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Forward query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Naver API Proxy Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Cafe24 API endpoints
// ==========================================

// Cafe24 주문 조회 (페이지네이션 전체 처리, 타임아웃 없음)
app.post('/cafe24/orders', authenticate, async (req, res) => {
  try {
    const { mallId, accessToken, startDate, endDate } = req.body;

    if (!mallId || !accessToken || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'mallId, accessToken, startDate, endDate are required',
      });
    }

    console.log(`[cafe24] Fetching orders: ${mallId} ${startDate} ~ ${endDate}`);

    const allOrders = [];
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
      if (useEmbed) params.set('embed', 'items');

      const url = `https://${mallId}.cafe24api.com/api/v2/admin/orders?${params}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2025-12-01',
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
        console.error(`[cafe24] API error: ${response.status} ${errorText}`);
        let detail = '';
        try {
          const errJson = JSON.parse(errorText);
          detail = errJson.error?.message || errJson.error?.code || errJson.message || errorText;
        } catch {
          detail = errorText.substring(0, 300);
        }
        return res.status(200).json({
          success: false,
          error: `Cafe24 API 오류: ${response.status} - ${detail}`,
        });
      }

      const data = await response.json();
      const orders = data.orders || [];

      if (orders.length === 0) break;

      allOrders.push(...orders);
      offset += limit;

      console.log(`[cafe24] Fetched page: offset=${offset}, orders=${orders.length}, total=${allOrders.length}`);

      // 안전 장치: 최대 10000건
      if (offset >= 10000) break;
    }

    console.log(`[cafe24] Complete: ${allOrders.length} orders`);

    res.json({
      success: true,
      orders: allOrders,
      count: allOrders.length,
    });
  } catch (error) {
    console.error('[Cafe24 Orders Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cafe24 연결 테스트
app.post('/cafe24/test', authenticate, async (req, res) => {
  try {
    const { mallId, accessToken } = req.body;

    if (!mallId || !accessToken) {
      return res.status(400).json({ success: false, error: 'mallId and accessToken are required' });
    }

    const response = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/store`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2025-12-01',
        },
      }
    );

    if (response.ok) {
      return res.json({ success: true, message: 'Cafe24 API 연결 성공!' });
    }

    const errText = await response.text();
    res.json({
      success: false,
      message: `Cafe24 API 응답 오류 (${response.status})`,
    });
  } catch (error) {
    console.error('[Cafe24 Test Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// Generic proxy endpoint (Coupang, etc.)
// ==========================================

app.post('/proxy', authenticate, async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const fetchOptions = {
      method: method || 'GET',
      headers: headers || {},
    };

    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Try JSON first, fallback to text
    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.status(response.status).json({
      status: response.status,
      data,
    });
  } catch (error) {
    console.error('[Proxy Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Naver Commerce Proxy running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
