import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ProjectType, ProjectTypeSetting, NotificationSettings } from '../types';

// 기본 프로젝트 유형 설정
const defaultProjectTypes: { type: ProjectType; name: string; order: number }[] = [
  { type: 'sampling', name: '샘플링', order: 0 },
  { type: 'detail_page', name: '상세페이지 제작', order: 1 },
  { type: 'influencer', name: '인플루언서 협업', order: 2 },
  { type: 'product_order', name: '제품 발주', order: 3 },
  { type: 'group_purchase', name: '공동구매', order: 4 },
  { type: 'other', name: '기타', order: 5 },
];

interface ProjectSettingsState {
  projectTypeSettings: ProjectTypeSetting[];
  notificationSettings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;

  // 프로젝트 유형 설정
  fetchProjectTypeSettings: () => Promise<void>;
  updateProjectTypeSetting: (projectType: ProjectType, updates: Partial<ProjectTypeSetting>) => Promise<void>;
  toggleProjectTypeVisibility: (projectType: ProjectType) => Promise<void>;

  // 알림 설정
  fetchNotificationSettings: () => Promise<void>;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => Promise<void>;

  // 헬퍼
  getVisibleProjectTypes: () => ProjectTypeSetting[];
  isProjectTypeVisible: (projectType: ProjectType) => boolean;
}

export const useProjectSettingsStore = create<ProjectSettingsState>((set, get) => ({
  projectTypeSettings: [],
  notificationSettings: null,
  isLoading: false,
  error: null,

  fetchProjectTypeSettings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('project_type_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // 데이터가 없으면 기본값으로 초기화
      if (!data || data.length === 0) {
        const defaultSettings = defaultProjectTypes.map((pt) => ({
          user_id: user.id,
          project_type: pt.type,
          is_visible: true,
          display_order: pt.order,
          custom_name: null,
        }));

        const { error: insertError } = await supabase
          .from('project_type_settings')
          .insert(defaultSettings);

        if (insertError) throw insertError;

        // 다시 조회
        const { data: newData, error: fetchError } = await supabase
          .from('project_type_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        const settings: ProjectTypeSetting[] = (newData || []).map((row) => ({
          id: row.id,
          projectType: row.project_type as ProjectType,
          isVisible: row.is_visible,
          displayOrder: row.display_order,
          customName: row.custom_name || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        set({ projectTypeSettings: settings });
      } else {
        const settings: ProjectTypeSetting[] = data.map((row) => ({
          id: row.id,
          projectType: row.project_type as ProjectType,
          isVisible: row.is_visible,
          displayOrder: row.display_order,
          customName: row.custom_name || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        set({ projectTypeSettings: settings });
      }
    } catch (error) {
      console.error('Fetch project type settings error:', error);
      // 에러 시 기본값 사용
      const defaultSettings: ProjectTypeSetting[] = defaultProjectTypes.map((pt) => ({
        id: pt.type,
        projectType: pt.type,
        isVisible: true,
        displayOrder: pt.order,
        customName: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      set({ projectTypeSettings: defaultSettings, error: '설정을 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProjectTypeSetting: async (projectType, updates) => {
    // 먼저 UI 상태 업데이트 (즉시 반영)
    set((state) => ({
      projectTypeSettings: state.projectTypeSettings.map((s) =>
        s.projectType === projectType ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    }));

    // 백그라운드에서 DB 업데이트 시도
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      if (updates.customName !== undefined) dbUpdates.custom_name = updates.customName || null;

      await supabase
        .from('project_type_settings')
        .update(dbUpdates)
        .eq('user_id', user.id)
        .eq('project_type', projectType);
    } catch (error) {
      console.error('Update project type setting error:', error);
    }
  },

  toggleProjectTypeVisibility: async (projectType) => {
    const setting = get().projectTypeSettings.find((s) => s.projectType === projectType);
    if (setting) {
      await get().updateProjectTypeSetting(projectType, { isVisible: !setting.isVisible });
    }
  },

  fetchNotificationSettings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // 기본 설정 생성
        const defaultSettings = {
          user_id: user.id,
          dday_email_enabled: false,
          dday_days_before: [3, 1, 0],
          dday_overdue_enabled: false,
          status_change_enabled: true,
          weekly_summary_enabled: false,
          notification_email: null,
          naver_works_enabled: true,
          naver_works_dday_enabled: true,
          naver_works_overdue_enabled: true,
          naver_works_status_change_enabled: false,
        };

        const { data: newData, error: insertError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) throw insertError;

        set({
          notificationSettings: {
            id: newData.id,
            ddayEmailEnabled: newData.dday_email_enabled,
            ddayDaysBefore: newData.dday_days_before,
            ddayOverdueEnabled: newData.dday_overdue_enabled,
            statusChangeEnabled: newData.status_change_enabled,
            weeklySummaryEnabled: newData.weekly_summary_enabled,
            notificationEmail: newData.notification_email || undefined,
            naverWorksEnabled: newData.naver_works_enabled ?? true,
            naverWorksDdayEnabled: newData.naver_works_dday_enabled ?? true,
            naverWorksOverdueEnabled: newData.naver_works_overdue_enabled ?? true,
            naverWorksStatusChangeEnabled: newData.naver_works_status_change_enabled ?? false,
            createdAt: newData.created_at,
            updatedAt: newData.updated_at,
          },
        });
      } else {
        set({
          notificationSettings: {
            id: data.id,
            ddayEmailEnabled: data.dday_email_enabled,
            ddayDaysBefore: data.dday_days_before,
            ddayOverdueEnabled: data.dday_overdue_enabled,
            statusChangeEnabled: data.status_change_enabled,
            weeklySummaryEnabled: data.weekly_summary_enabled,
            notificationEmail: data.notification_email || undefined,
            naverWorksEnabled: data.naver_works_enabled ?? true,
            naverWorksDdayEnabled: data.naver_works_dday_enabled ?? true,
            naverWorksOverdueEnabled: data.naver_works_overdue_enabled ?? true,
            naverWorksStatusChangeEnabled: data.naver_works_status_change_enabled ?? false,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        });
      }
    } catch (error) {
      console.error('Fetch notification settings error:', error);
      // 에러 시 기본값 사용
      set({
        notificationSettings: {
          id: 'default',
          ddayEmailEnabled: false,
          ddayDaysBefore: [3, 1, 0],
          ddayOverdueEnabled: false,
          statusChangeEnabled: true,
          weeklySummaryEnabled: false,
          naverWorksEnabled: true,
          naverWorksDdayEnabled: true,
          naverWorksOverdueEnabled: true,
          naverWorksStatusChangeEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }
  },

  updateNotificationSettings: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.ddayEmailEnabled !== undefined) dbUpdates.dday_email_enabled = updates.ddayEmailEnabled;
      if (updates.ddayDaysBefore !== undefined) dbUpdates.dday_days_before = updates.ddayDaysBefore;
      if (updates.ddayOverdueEnabled !== undefined) dbUpdates.dday_overdue_enabled = updates.ddayOverdueEnabled;
      if (updates.statusChangeEnabled !== undefined) dbUpdates.status_change_enabled = updates.statusChangeEnabled;
      if (updates.weeklySummaryEnabled !== undefined) dbUpdates.weekly_summary_enabled = updates.weeklySummaryEnabled;
      if (updates.notificationEmail !== undefined) dbUpdates.notification_email = updates.notificationEmail || null;
      if (updates.naverWorksEnabled !== undefined) dbUpdates.naver_works_enabled = updates.naverWorksEnabled;
      if (updates.naverWorksDdayEnabled !== undefined) dbUpdates.naver_works_dday_enabled = updates.naverWorksDdayEnabled;
      if (updates.naverWorksOverdueEnabled !== undefined) dbUpdates.naver_works_overdue_enabled = updates.naverWorksOverdueEnabled;
      if (updates.naverWorksStatusChangeEnabled !== undefined) dbUpdates.naver_works_status_change_enabled = updates.naverWorksStatusChangeEnabled;

      const { error } = await supabase
        .from('notification_settings')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        notificationSettings: state.notificationSettings
          ? { ...state.notificationSettings, ...updates, updatedAt: new Date().toISOString() }
          : null,
      }));
    } catch (error) {
      console.error('Update notification settings error:', error);
    }
  },

  getVisibleProjectTypes: () => {
    return get().projectTypeSettings
      .filter((s) => s.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  isProjectTypeVisible: (projectType) => {
    const setting = get().projectTypeSettings.find((s) => s.projectType === projectType);
    return setting?.isVisible ?? true;
  },
}));

// 프로젝트 유형 라벨 (기본값)
export const defaultProjectTypeLabels: Record<ProjectType, string> = {
  sampling: '샘플링',
  detail_page: '상세페이지 제작',
  influencer: '인플루언서 협업',
  product_order: '제품 발주',
  group_purchase: '공동구매',
  other: '기타',
};
