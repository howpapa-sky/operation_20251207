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

// API Key authentication middleware
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-proxy-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    var receivedLen = apiKey ? apiKey.length : 0;
    var expectedLen = API_KEY ? API_KEY.length : 0;
    console.log('[AUTH FAIL] path=' + req.path + ' received_len=' + receivedLen + ' expected_len=' + expectedLen);
    return res.status(401).json({ error: 'Unauthorized', receivedLen: receivedLen, expectedLen: expectedLen });
  }
  next();
}

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeySet: API_KEY.length > 0,
    apiKeyLen: API_KEY.length
  });
});

// ==========================================
// Naver Commerce API endpoints
// ==========================================

// 토큰 발급 헬퍼 (내부 재사용)
async function generateNaverToken(clientId, clientSecret) {
  // Trim whitespace to prevent copy-paste issues
  clientId = (clientId || '').trim();
  clientSecret = (clientSecret || '').trim();

  const timestamp = Date.now();
  const password = clientId + '_' + timestamp;
  var hashedSign;
  try {
    hashedSign = bcrypt.hashSync(password, clientSecret);
  } catch (e) {
    throw new Error('bcrypt hash failed: ' + e.message + ' (secret_len=' + (clientSecret ? clientSecret.length : 0) + ')');
  }

  // DO NOT MODIFY: Naver Commerce API requires Base64(bcrypt(password, salt))
  var base64Sign = Buffer.from(hashedSign).toString('base64');

  // Use URLSearchParams for proper form encoding
  var params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('timestamp', String(timestamp));
  params.set('client_secret_sign', base64Sign);
  params.set('grant_type', 'client_credentials');
  params.set('type', 'SELF');

  console.log('[naver-token] clientId=' + clientId.substring(0, 6) + '... secret_len=' + clientSecret.length + ' hash_len=' + hashedSign.length + ' base64_len=' + base64Sign.length);

  const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  var text = await response.text();
  console.log('[naver-token] response status=' + response.status + ' body=' + text.substring(0, 300));

  var data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('Naver token parse error: ' + text.substring(0, 200));
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.message || data.error || 'Token request failed (status=' + response.status + ')');
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

    // 2. 변경된 주문 ID 조회 (1일 단위 청크로 분할 - Naver API 날짜 범위 제한)
    const allIds = [];

    // 1일 단위 청크 생성 (YYYY-MM-DD 문자열 기반 - 타임존 무관)
    var chunks = [];
    var cur = new Date(startDate);
    var end = new Date(endDate);
    while (cur <= end) {
      var dateStr = cur.toISOString().split('T')[0];
      chunks.push({
        from: dateStr + 'T00:00:00.000+09:00',
        to: dateStr + 'T23:59:59.999+09:00',
      });
      cur.setDate(cur.getDate() + 1);
    }

    console.log(`[naver-sync] Split into ${chunks.length} day-chunks`);

    for (var ci = 0; ci < chunks.length; ci++) {
      if (ci > 0) await new Promise(r => setTimeout(r, 300));

      var lastChangedFrom = chunks[ci].from;
      var lastChangedTo = chunks[ci].to;
      var moreSequence = null;

      while (true) {
        var params = new URLSearchParams({ lastChangedFrom, lastChangedTo });
        if (moreSequence) params.set('moreSequence', moreSequence);

        // DO NOT MODIFY URL: must be "product-orders" not "orders" (404 if wrong)
        var url = `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses?${params}`;
        var response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429) {
          console.log('[naver-sync] 429 Rate Limit - waiting 1s');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (!response.ok) {
          var err = await response.json().catch(() => ({}));
          return res.json({
            success: false,
            message: `주문 조회 실패 (${response.status}): ${err.message || JSON.stringify(err)}`,
          });
        }

        var data = await response.json();
        var statuses = data.data?.lastChangeStatuses || [];
        if (statuses.length === 0) break;

        allIds.push(...statuses.map(s => s.productOrderId));
        moreSequence = data.data?.moreSequence || null;
        if (!moreSequence) break;
      }

      console.log(`[naver-sync] Chunk ${ci + 1}/${chunks.length}: ${allIds.length} total IDs`);
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
