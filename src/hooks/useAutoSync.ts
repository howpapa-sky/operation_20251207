import { useEffect, useRef, useCallback, useState } from 'react';
import { syncOrders } from '@/services/orderSyncService';
import type { SyncResult } from '@/services/orderSyncService';

const SYNC_INTERVAL_MS = 1 * 60 * 1000; // 1분마다 자동 동기화
const RECENT_DAYS = 7; // 증분 동기화 범위 (대시보드 기본 7일과 일치)
const STORAGE_KEY = 'order_auto_sync';

interface AutoSyncState {
  enabled: boolean;
  lastSyncAt: string | null;
  lastResult: SyncResult | null;
  isSyncing: boolean;
}

function getStoredState(): { lastSyncAt: string | null; enabled: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        lastSyncAt: parsed.lastSyncAt || null,
        enabled: parsed.enabled !== false, // 기본값 true
      };
    }
  } catch { /* ignore */ }
  return { lastSyncAt: null, enabled: true };
}

function saveState(lastSyncAt: string | null, enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lastSyncAt, enabled }));
  } catch { /* ignore */ }
}

function formatDateStr(d: Date): string {
  // 로컬 날짜 기준 (toISOString은 UTC 변환되어 KST에서 하루 밀림)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useAutoSync(channels: string | string[], onSyncComplete?: () => void, brandId?: string) {
  const channelList = Array.isArray(channels) ? channels : [channels];
  const stored = getStoredState();
  const [state, setState] = useState<AutoSyncState>({
    enabled: stored.enabled,
    lastSyncAt: stored.lastSyncAt,
    lastResult: null,
    isSyncing: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncingRef = useRef(false);

  const doSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true }));

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - RECENT_DAYS);

    let lastResult: SyncResult | null = null;
    let anySuccess = false;

    for (const ch of channelList) {
      try {
        const result = await syncOrders({
          channel: ch,
          startDate: formatDateStr(startDate),
          endDate: formatDateStr(endDate),
          brandId,
        });
        lastResult = result;
        if (result.success) anySuccess = true;
      } catch {
        // 개별 채널 실패 시 다음 채널 계속 진행
      }
    }

    const now = new Date().toISOString();
    saveState(now, true);
    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncAt: now,
      lastResult: lastResult,
    }));
    syncingRef.current = false;

    if (anySuccess && onSyncComplete) {
      onSyncComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelList.join(','), onSyncComplete, brandId]);

  const setEnabled = useCallback((enabled: boolean) => {
    setState(prev => {
      saveState(prev.lastSyncAt, enabled);
      return { ...prev, enabled };
    });
  }, []);

  // 자동 동기화 인터벌 관리
  useEffect(() => {
    if (!state.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 즉시 1회 실행 (마지막 동기화로부터 1분 이상 경과 시)
    const lastSync = state.lastSyncAt ? new Date(state.lastSyncAt).getTime() : 0;
    const elapsed = Date.now() - lastSync;
    if (elapsed >= SYNC_INTERVAL_MS) {
      doSync();
    }

    // 1분마다 반복
    intervalRef.current = setInterval(doSync, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.enabled, doSync]);

  return {
    ...state,
    setEnabled,
    syncNow: doSync,
  };
}
