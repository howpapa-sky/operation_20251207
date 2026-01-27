import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { notifyDevRequestCompleted } from '../lib/sendNaverWorks';

// Type workaround - dev_requests 테이블이 아직 타입에 없음
const db = supabase as any;
import {
  DevRequest,
  DevRequestStatus,
  DevRequestPriority,
  DevRequestBrand,
  DevRequestType,
} from '../types';

interface DevRequestState {
  requests: DevRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<DevRequest, 'id' | 'created_at' | 'updated_at'>) => Promise<DevRequest>;
  updateRequest: (id: string, updates: Partial<DevRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  updateStatus: (id: string, status: DevRequestStatus) => Promise<void>;

  // Stats
  getStats: () => {
    total: number;
    byStatus: Record<DevRequestStatus, number>;
    byPriority: Record<DevRequestPriority, number>;
    byBrand: Record<DevRequestBrand, number>;
    byType: Record<DevRequestType, number>;
  };
}

function dbToRequest(record: any): DevRequest {
  return {
    id: record.id,
    request_date: record.request_date,
    requester: record.requester,
    brand: record.brand,
    request_type: record.request_type,
    title: record.title,
    description: record.description || '',
    priority: record.priority,
    due_date: record.due_date || undefined,
    status: record.status,
    completed_at: record.completed_at || undefined,
    notes: record.notes || undefined,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export const useDevRequestStore = create<DevRequestState>((set, get) => ({
  requests: [],
  isLoading: false,
  error: null,

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db
        .from('dev_requests')
        .select('*')
        .order('request_date', { ascending: false });

      if (error) throw error;

      const requests = (data || []).map(dbToRequest);
      set({ requests, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addRequest: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db
        .from('dev_requests')
        .insert({
          request_date: request.request_date,
          requester: request.requester,
          brand: request.brand,
          request_type: request.request_type,
          title: request.title,
          description: request.description || null,
          priority: request.priority,
          due_date: request.due_date || null,
          status: request.status,
          completed_at: request.completed_at || null,
          notes: request.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newRequest = dbToRequest(data);
      set((state) => ({
        requests: [newRequest, ...state.requests],
        isLoading: false,
      }));

      return newRequest;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateRequest: async (id, updates) => {
    const previousRequests = get().requests;

    // 낙관적 업데이트
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
      ),
    }));

    try {
      const dbUpdates: any = {};
      const fieldMap: Record<string, string> = {
        request_date: 'request_date',
        requester: 'requester',
        brand: 'brand',
        request_type: 'request_type',
        title: 'title',
        description: 'description',
        priority: 'priority',
        due_date: 'due_date',
        status: 'status',
        completed_at: 'completed_at',
        notes: 'notes',
      };

      Object.keys(updates).forEach((key) => {
        if (fieldMap[key] && updates[key as keyof typeof updates] !== undefined) {
          dbUpdates[fieldMap[key]] = updates[key as keyof typeof updates];
        }
      });

      const { error } = await db
        .from('dev_requests')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      set({ requests: previousRequests, error: error.message });
      throw error;
    }
  },

  deleteRequest: async (id) => {
    const previousRequests = get().requests;

    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id),
    }));

    try {
      const { error } = await db
        .from('dev_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      set({ requests: previousRequests, error: error.message });
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    const updates: Partial<DevRequest> = { status };
    const completedAt = new Date().toISOString();

    if (status === 'completed') {
      updates.completed_at = completedAt;
    }

    // 완료 시 알림을 보내기 위해 요청 정보 가져오기
    const request = get().requests.find((r) => r.id === id);

    await get().updateRequest(id, updates);

    // 완료 시 네이버웍스 알림 전송
    if (status === 'completed' && request) {
      notifyDevRequestCompleted({
        title: request.title,
        requester: request.requester,
        brand: request.brand,
        requestType: request.request_type,
        completedAt,
      }).catch((error) => {
        console.error('개발요청 완료 알림 전송 실패:', error);
      });
    }
  },

  getStats: () => {
    const requests = get().requests;
    return {
      total: requests.length,
      byStatus: {
        pending: requests.filter((r) => r.status === 'pending').length,
        in_progress: requests.filter((r) => r.status === 'in_progress').length,
        completed: requests.filter((r) => r.status === 'completed').length,
        on_hold: requests.filter((r) => r.status === 'on_hold').length,
      },
      byPriority: {
        urgent: requests.filter((r) => r.priority === 'urgent').length,
        high: requests.filter((r) => r.priority === 'high').length,
        normal: requests.filter((r) => r.priority === 'normal').length,
        low: requests.filter((r) => r.priority === 'low').length,
      },
      byBrand: {
        howpapa: requests.filter((r) => r.brand === 'howpapa').length,
        nuccio: requests.filter((r) => r.brand === 'nuccio').length,
        common: requests.filter((r) => r.brand === 'common').length,
      },
      byType: {
        feature: requests.filter((r) => r.request_type === 'feature').length,
        ui: requests.filter((r) => r.request_type === 'ui').length,
        bug: requests.filter((r) => r.request_type === 'bug').length,
        other: requests.filter((r) => r.request_type === 'other').length,
      },
    };
  },
}));
