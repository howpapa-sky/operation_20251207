/**
 * 주문 동기화 서비스
 *
 * Netlify Function (commerce-proxy)을 통해 판매 채널 주문 데이터를 동기화합니다.
 */

const FUNCTION_URL = '/.netlify/functions/commerce-proxy';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  synced?: number;
  skipped?: number;
  total?: number;
  errors?: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 주문 동기화 실행
 */
export async function syncOrders(params: {
  channel: string;
  startDate: string;
  endDate: string;
}): Promise<SyncResult> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync-orders',
        channel: params.channel,
        startDate: params.startDate,
        endDate: params.endDate,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: '동기화 함수가 배포되지 않았습니다. 배포 후 다시 시도해주세요.',
        };
      }
      const text = await response.text();
      return {
        success: false,
        error: `서버 오류 (${response.status}): ${text}`,
      };
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: '동기화 함수가 배포되지 않았습니다. 배포 후 다시 시도해주세요.',
      };
    }
    return {
      success: false,
      error: `네트워크 오류: ${error.message}`,
    };
  }
}

/**
 * 연결 테스트
 */
export async function testChannelConnection(channel: string): Promise<ConnectionTestResult> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test-connection',
        channel,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: '동기화 함수가 배포되지 않았습니다.',
        };
      }
      return {
        success: false,
        message: `서버 오류: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      message: `연결 실패: ${error.message}`,
    };
  }
}
