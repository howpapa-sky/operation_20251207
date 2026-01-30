/**
 * 네이버 커머스 API 로컬 테스트 스크립트
 *
 * 사용법:
 *   cd proxy
 *   npm install
 *   node test-local.js <clientId> <clientSecret>
 *
 * 예시:
 *   node test-local.js XK4456keglIuCf2I6nPDT '$2a$04$eRZrI.of/j49XeM0r/5Wgu'
 *
 * 주의: clientSecret에 $ 기호가 포함되어 있으므로 반드시 작은따옴표로 감싸야 합니다.
 *
 * 사전 조건:
 *   네이버 커머스 API Center에서 API호출 IP를 본인 IP로 등록해야 합니다.
 */

const bcryptjs = require('bcryptjs');

const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error('사용법: node test-local.js <clientId> <clientSecret>');
  console.error('예시: node test-local.js XK4456keglIuCf2I6nPDT \'$2a$04$eRZrI.of/j49XeM0r/5Wgu\'');
  process.exit(1);
}

async function test() {
  console.log('=== 네이버 커머스 API 로컬 테스트 ===\n');

  // 1. 서명 생성
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  console.log(`1. 서명 생성`);
  console.log(`   clientId: ${clientId}`);
  console.log(`   clientSecret: ${clientSecret.substring(0, 10)}...`);
  console.log(`   timestamp: ${timestamp}`);
  console.log(`   password: ${clientId}_${timestamp}`);

  const hashed = bcryptjs.hashSync(password, clientSecret);
  const clientSecretSign = Buffer.from(hashed, 'utf-8').toString('base64');
  console.log(`   signature (base64): ${clientSecretSign.substring(0, 30)}...`);
  console.log('');

  // 2. 토큰 발급 요청
  console.log('2. 토큰 발급 요청...');
  const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: timestamp.toString(),
    client_secret_sign: clientSecretSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      console.log(`   ✓ 토큰 발급 성공!`);
      console.log(`   access_token: ${data.access_token.substring(0, 20)}...`);
      console.log(`   expires_in: ${data.expires_in}초`);
      console.log(`   token_type: ${data.token_type}`);
      console.log('');

      // 3. 간단한 API 호출 테스트 (상점 정보)
      console.log('3. API 호출 테스트 (변경 주문 조회)...');
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const startDate = yesterday.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const params = new URLSearchParams({
        lastChangedFrom: `${startDate}T00:00:00.000+09:00`,
        lastChangedTo: `${endDate}T23:59:59.999+09:00`,
      });

      const orderUrl = `https://api.commerce.naver.com/external/v1/pay-order/seller/orders/last-changed-statuses?${params.toString()}`;

      const orderResponse = await fetch(orderUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const orderData = await orderResponse.json();

      if (orderResponse.ok) {
        const orders = orderData.data?.lastChangeStatuses || [];
        console.log(`   ✓ 주문 조회 성공!`);
        console.log(`   조회 기간: ${startDate} ~ ${endDate}`);
        console.log(`   변경된 주문: ${orders.length}건`);
      } else {
        console.log(`   ✗ 주문 조회 실패 (${orderResponse.status})`);
        console.log(`   응답:`, JSON.stringify(orderData, null, 2));
      }
    } else {
      console.log(`   ✗ 토큰 발급 실패 (${response.status})`);
      console.log(`   응답:`, JSON.stringify(data, null, 2));

      if (data.message?.includes('IP')) {
        console.log('');
        console.log('   → IP 관련 오류입니다.');
        console.log('   → 네이버 커머스 API Center에서 API호출 IP를 본인 IP로 등록해주세요.');
        console.log('   → IP 확인: curl -s ifconfig.me');
      }
    }
  } catch (error) {
    console.error(`   ✗ 네트워크 오류: ${error.message}`);
  }

  console.log('\n=== 테스트 완료 ===');
}

test();
