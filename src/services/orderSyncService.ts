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
 * Cafe24 등 날짜 범위 제한이 있는 채널용 분할 동기화
 * 긴 기간을 3개월 단위로 나눠 순차 호출 (Netlify 504 타임아웃 방지)
 */
export async function syncOrdersChunked(params: {
  channel: string;
  startDate: string;
  endDate: string;
  onProgress?: (current: number, total: number, chunkResult?: SyncResult) => void;
}): Promise<SyncResult> {
  const CHUNK_DAYS = 89; // ~3개월
  const MS_PER_DAY = 86400000;
  const chunks: { start: string; end: string }[] = [];

  let cur = new Date(params.startDate + 'T00:00:00');
  const end = new Date(params.endDate + 'T00:00:00');

  while (cur < end) {
    const chunkEnd = new Date(Math.min(cur.getTime() + CHUNK_DAYS * MS_PER_DAY, end.getTime()));
    chunks.push({
      start: cur.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });
    cur = new Date(chunkEnd.getTime() + MS_PER_DAY);
  }

  if (chunks.length === 0) {
    return { success: false, error: '날짜 범위가 올바르지 않습니다.' };
  }

  let totalSynced = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    params.onProgress?.(i + 1, chunks.length);

    const result = await syncOrders({
      channel: params.channel,
      startDate: chunk.start,
      endDate: chunk.end,
    });

    if (!result.success) {
      return {
        success: false,
        error: `${chunk.start}~${chunk.end} 구간 실패: ${result.error}`,
        synced: totalSynced,
        skipped: totalSkipped,
        errors: allErrors,
      };
    }

    totalSynced += result.synced ?? 0;
    totalSkipped += result.skipped ?? 0;
    if (result.errors) allErrors.push(...result.errors);

    params.onProgress?.(i + 1, chunks.length, result);
  }

  return {
    success: true,
    message: `${totalSynced}건 동기화 완료`,
    synced: totalSynced,
    skipped: totalSkipped,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
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
