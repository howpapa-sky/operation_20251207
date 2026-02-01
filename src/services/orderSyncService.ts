/**
 * 주문 동기화 서비스
 *
 * Netlify Function (commerce-proxy)을 통해 판매 채널 주문 데이터를 동기화합니다.
 * 모든 채널에 대해 날짜 분할(chunked) 방식으로 Netlify 타임아웃(10s)을 방지합니다.
 */

const FUNCTION_URL = '/.netlify/functions/commerce-proxy';

/** 채널별 청크 일수 (Netlify 10s 타임아웃 대응) */
const CHUNK_DAYS: Record<string, number> = {
  smartstore: 3,    // 네이버: 3일 단위 (NCP에서 1일씩 재분할 → Netlify 타임아웃 방지)
  cafe24: 30,       // Cafe24: 30일 단위
  coupang: 14,      // 쿠팡: 14일 단위 (향후 확장)
};
const DEFAULT_CHUNK_DAYS = 14;

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  synced?: number;
  skipped?: number;
  total?: number;
  errors?: string[];
}

export interface SyncProgress {
  /** 현재 청크 번호 (1-based) */
  current: number;
  /** 총 청크 수 */
  total: number;
  /** 누적 동기화 건수 */
  syncedSoFar: number;
  /** 경과 시간 (ms) */
  elapsedMs: number;
  /** 현재 처리 중인 날짜 범위 */
  dateRange: string;
  /** 현재 청크 결과 (완료된 경우) */
  chunkResult?: SyncResult;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 단일 청크 주문 동기화 (내부용)
 */
async function syncOrdersChunk(params: {
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
        error: `서버 오류 (${response.status}): ${text.substring(0, 200)}`,
      };
    }

    return await response.json();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        success: false,
        error: '동기화 함수가 배포되지 않았습니다. 배포 후 다시 시도해주세요.',
      };
    }
    return {
      success: false,
      error: `네트워크 오류: ${err.message}`,
    };
  }
}

/**
 * 주문 동기화 실행 (모든 채널 공통 - 자동으로 청크 분할)
 */
export async function syncOrders(params: {
  channel: string;
  startDate: string;
  endDate: string;
  onProgress?: (progress: SyncProgress) => void;
}): Promise<SyncResult & { elapsedMs?: number }> {
  const startTime = Date.now();
  const chunkDays = CHUNK_DAYS[params.channel] || DEFAULT_CHUNK_DAYS;
  const MS_PER_DAY = 86400000;

  // 날짜 범위를 청크로 분할 (UTC로 파싱하여 타임존 밀림 방지)
  const chunks: { start: string; end: string }[] = [];
  let cur = new Date(params.startDate + 'T00:00:00Z');
  const end = new Date(params.endDate + 'T00:00:00Z');

  while (cur <= end) {
    const chunkEnd = new Date(Math.min(cur.getTime() + (chunkDays - 1) * MS_PER_DAY, end.getTime()));
    chunks.push({
      start: cur.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });
    cur = new Date(chunkEnd.getTime() + MS_PER_DAY);
  }

  if (chunks.length === 0) {
    return { success: false, error: '날짜 범위가 올바르지 않습니다.' };
  }

  // 단일 청크면 직접 호출 (오버헤드 최소화)
  if (chunks.length === 1) {
    params.onProgress?.({
      current: 1,
      total: 1,
      syncedSoFar: 0,
      elapsedMs: Date.now() - startTime,
      dateRange: `${chunks[0].start} ~ ${chunks[0].end}`,
    });

    const result = await syncOrdersChunk({
      channel: params.channel,
      startDate: chunks[0].start,
      endDate: chunks[0].end,
    });

    return { ...result, elapsedMs: Date.now() - startTime };
  }

  // 멀티 청크: 순차 실행 + 진행률 보고
  let totalSynced = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const dateRange = `${chunk.start} ~ ${chunk.end}`;

    params.onProgress?.({
      current: i + 1,
      total: chunks.length,
      syncedSoFar: totalSynced,
      elapsedMs: Date.now() - startTime,
      dateRange,
    });

    const result = await syncOrdersChunk({
      channel: params.channel,
      startDate: chunk.start,
      endDate: chunk.end,
    });

    if (!result.success) {
      return {
        success: false,
        error: `${dateRange} 구간 실패: ${result.error}`,
        synced: totalSynced,
        skipped: totalSkipped,
        errors: allErrors,
        elapsedMs: Date.now() - startTime,
      };
    }

    totalSynced += result.synced ?? 0;
    totalSkipped += result.skipped ?? 0;
    if (result.errors) allErrors.push(...result.errors);

    params.onProgress?.({
      current: i + 1,
      total: chunks.length,
      syncedSoFar: totalSynced,
      elapsedMs: Date.now() - startTime,
      dateRange,
      chunkResult: result,
    });
  }

  return {
    success: true,
    message: `${totalSynced}건 동기화 완료`,
    synced: totalSynced,
    skipped: totalSkipped,
    total: totalSynced + totalSkipped,
    errors: allErrors.length > 0 ? allErrors : undefined,
    elapsedMs: Date.now() - startTime,
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
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      message: `연결 실패: ${err.message}`,
    };
  }
}
