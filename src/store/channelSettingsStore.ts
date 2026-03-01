import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/apiErrorHandler';
import type { SalesChannel, SalesChannelSettings } from '../types/ecommerce';

const db = supabase as any;

interface ChannelSettingsState {
  channels: SalesChannelSettings[];
  isLoading: boolean;
  error: string | null;

  fetchChannels: () => Promise<void>;
  updateChannel: (id: string, updates: Partial<SalesChannelSettings>) => Promise<void>;
  getChannelFeeRate: (channel: SalesChannel) => number;
  getChannelShippingFee: (channel: SalesChannel) => number;
}

export const useChannelSettingsStore = create<ChannelSettingsState>((set, get) => ({
  channels: [],
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db
        .from('sales_channel_settings')
        .select('*')
        .order('channel');

      if (error) throw error;

      const channels: SalesChannelSettings[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        channel: row.channel as SalesChannel,
        channelName: row.channel_name as string,
        feeRate: parseFloat(String(row.fee_rate)) || 0,
        shippingFee: parseFloat(String(row.shipping_fee)) || 0,
        isActive: row.is_active as boolean,
        lastSyncAt: row.last_sync_at as string | undefined,
        syncStatus: (row.sync_status as string) || 'pending',
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));

      set({ channels, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      handleApiError(error, '채널 설정 조회');
      console.error('Fetch channel settings error:', message);
      set({ error: message, isLoading: false });
    }
  },

  updateChannel: async (id, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.feeRate !== undefined) dbUpdates.fee_rate = updates.feeRate;
      if (updates.shippingFee !== undefined) dbUpdates.shipping_fee = updates.shippingFee;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.channelName !== undefined) dbUpdates.channel_name = updates.channelName;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await db
        .from('sales_channel_settings')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        channels: state.channels.map((ch) =>
          ch.id === id ? { ...ch, ...updates, updatedAt: new Date().toISOString() } : ch
        ),
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      handleApiError(error, '채널 설정 변경');
      console.error('Update channel error:', message);
      set({ error: message });
    }
  },

  getChannelFeeRate: (channel) => {
    const ch = get().channels.find((c) => c.channel === channel);
    return ch?.feeRate ?? 0;
  },

  getChannelShippingFee: (channel) => {
    const ch = get().channels.find((c) => c.channel === channel);
    return ch?.shippingFee ?? 0;
  },
}));
