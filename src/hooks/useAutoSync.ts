import { useEffect, useRef, useCallback, useState } from 'react';
import { syncOrders } from '@/services/orderSyncService';
import type { SyncResult } from '@/services/orderSyncService';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분
const RECENT_DAYS = 3; // 증분 동기화 범위 (최근 3일)
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
  return d.toISOString().split('T')[0];
}

export function useAutoSync(channel: string, onSyncComplete?: () => void) {
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

    const result = await syncOrders({
      channel,
      startDate: formatDateStr(startDate),
      endDate: formatDateStr(endDate),
    });

    const now = new Date().toISOString();
    saveState(now, true);
    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSyncAt: now,
      lastResult: result,
    }));
    syncingRef.current = false;

    if (result.success && onSyncComplete) {
      onSyncComplete();
    }
  }, [channel, onSyncComplete]);

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

    // 즉시 1회 실행 (마지막 동기화로부터 5분 이상 경과 시)
    const lastSync = state.lastSyncAt ? new Date(state.lastSyncAt).getTime() : 0;
    const elapsed = Date.now() - lastSync;
    if (elapsed >= SYNC_INTERVAL_MS) {
      doSync();
    }

    // 5분마다 반복
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
