import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AlertSettings } from '../types';

interface AlertSettingsState {
  settings: AlertSettings | null;
  isLoading: boolean;
  error: string | null;

  fetchAlertSettings: () => Promise<void>;
  updateAlertSettings: (updates: Partial<AlertSettings>) => Promise<void>;
  initAlertSettings: () => Promise<void>;
}

// DB → 프론트엔드 타입 변환
function dbToAlertSettings(row: Record<string, unknown>): AlertSettings {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    isEnabled: row.is_enabled as boolean,
    salesDropThreshold: row.sales_drop_threshold as number,
    roasTarget: row.roas_target as number,
    lowStockAlert: row.low_stock_alert as boolean,
    notificationEmail: (row.notification_email as string) || null,
    notificationNaverWorks: row.notification_naver_works as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useAlertSettingsStore = create<AlertSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  // 알림 설정 조회
  fetchAlertSettings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // 레코드 없음 → 기본값으로 생성
        await get().initAlertSettings();
        return;
      }

      if (error) throw error;
      set({ settings: dbToAlertSettings(data) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch alert settings';
      console.error('fetchAlertSettings error:', err);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  // 알림 설정 업데이트
  updateAlertSettings: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = get().settings;
    if (!current) return;

    // UI 즉시 반영
    set({ settings: { ...current, ...updates } });

    const dbUpdates: Record<string, unknown> = {};
    if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
    if (updates.salesDropThreshold !== undefined) dbUpdates.sales_drop_threshold = updates.salesDropThreshold;
    if (updates.roasTarget !== undefined) dbUpdates.roas_target = updates.roasTarget;
    if (updates.lowStockAlert !== undefined) dbUpdates.low_stock_alert = updates.lowStockAlert;
    if (updates.notificationEmail !== undefined) dbUpdates.notification_email = updates.notificationEmail;
    if (updates.notificationNaverWorks !== undefined) dbUpdates.notification_naver_works = updates.notificationNaverWorks;

    try {
      const { error } = await (supabase as any)
        .from('alert_settings')
        .update(dbUpdates)
        .eq('id', current.id);

      if (error) throw error;
    } catch (err: unknown) {
      // 실패 시 롤백
      set({ settings: current });
      const message = err instanceof Error ? err.message : 'Failed to update alert settings';
      console.error('updateAlertSettings error:', err);
      set({ error: message });
    }
  },

  // 초기 레코드 생성
  initAlertSettings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('alert_settings')
        .insert({
          user_id: user.id,
          is_enabled: true,
          sales_drop_threshold: 30,
          roas_target: 300,
          low_stock_alert: true,
          notification_naver_works: true,
        })
        .select()
        .single();

      if (error) throw error;
      set({ settings: dbToAlertSettings(data) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to init alert settings';
      console.error('initAlertSettings error:', err);
      set({ error: message });
    }
  },
}));
