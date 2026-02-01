/**
 * 네이버 커머스 API 프록시 서버
 *
 * NCP Micro 서버 등 고정 IP 환경에 배포하여
 * 네이버 커머스 API의 IP 화이트리스트 요구사항을 해결합니다.
 *
 * 환경변수:
 *   PORT - 서버 포트 (기본: 3100)
 *   PROXY_API_KEY - 프록시 접근 인증 키 (필수)
 *
 * 사용법:
 *   npm install
 *   PROXY_API_KEY=your-secret-key node server.js
 */

const express = require('express');
const bcryptjs = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3100;
const PROXY_API_KEY = process.env.PROXY_API_KEY;

if (!PROXY_API_KEY) {
  console.error('PROXY_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// API 키 인증 미들웨어 (x-api-key, x-proxy-api-key 모두 허용)
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-proxy-api-key'];
  if (apiKey !== PROXY_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// bcrypt 서명 생성 (네이버 커머스 API)
function generateSignature(clientId, clientSecret, timestamp) {
  const password = `${clientId}_${timestamp}`;
  const hashed = bcryptjs.hashSync(password, clientSecret);
  return Buffer.from(hashed, 'utf-8').toString('base64');
}

// 네이버 토큰 발급
async function getAccessToken(clientId, clientSecret) {
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
    throw new Error(data.message || data.error || '인증 정보를 확인하세요');
  }

  return data.access_token;
}

// 변경된 주문 목록 조회
async function fetchChangedOrders(accessToken, startDate, endDate) {
  const allOrders = [];
  const lastChangedFrom = `${startDate}T00:00:00.000+09:00`;
  const lastChangedTo = `${endDate}T23:59:59.999+09:00`;

  let moreSequence = null;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ lastChangedFrom, lastChangedTo });
    if (moreSequence) {
      params.set('moreSequence', moreSequence);
    }

    const url = `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses?${params.toString()}`;

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

    const productOrderIds = lastChangeStatuses.map((item) => item.productOrderId);

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
async function fetchOrderDetails(accessToken, productOrderIds) {
  const orders = [];
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

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 연결 테스트 (토큰 발급만)
app.post('/api/naver/test', authenticate, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'clientId, clientSecret 필수',
      });
    }

    await getAccessToken(clientId, clientSecret);

    res.json({
      success: true,
      message: '네이버 스마트스토어 API 연결 성공!',
    });
  } catch (error) {
    res.json({
      success: false,
      message: `네이버 인증 실패: ${error.message}`,
    });
  }
});

// 주문 동기화 (토큰 발급 + 주문 조회)
app.post('/api/naver/sync', authenticate, async (req, res) => {
  try {
    const { clientId, clientSecret, startDate, endDate } = req.body;

    if (!clientId || !clientSecret || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'clientId, clientSecret, startDate, endDate 필수',
      });
    }

    console.log(`[프록시] 동기화 시작: ${startDate} ~ ${endDate}`);

    // 1. 토큰 발급
    const accessToken = await getAccessToken(clientId, clientSecret);
    console.log('[프록시] 토큰 발급 성공');

    // 2. 주문 조회
    const orders = await fetchChangedOrders(accessToken, startDate, endDate);
    console.log(`[프록시] 조회된 주문: ${orders.length}건`);

    res.json({
      success: true,
      message: `주문 ${orders.length}건 조회 완료`,
      data: { orders },
    });
  } catch (error) {
    console.error('[프록시] 에러:', error.message);
    res.status(500).json({
      success: false,
      message: `동기화 실패: ${error.message}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`네이버 API 프록시 서버 실행 중: http://localhost:${PORT}`);
  console.log(`헬스체크: http://localhost:${PORT}/health`);
});
