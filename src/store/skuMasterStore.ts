import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { SKUMaster, SKUCostHistory, ChannelOptionMapping, SalesChannel } from '../types/ecommerce';

// Type workaround - 새 테이블들이 아직 타입에 없음
const db = supabase as any;

interface SKUMasterState {
  skus: SKUMaster[];
  costHistory: SKUCostHistory[];
  channelMappings: ChannelOptionMapping[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSKUs: () => Promise<void>;
  addSKU: (sku: Omit<SKUMaster, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SKUMaster | null>;
  updateSKU: (id: string, updates: Partial<SKUMaster>) => Promise<void>;
  deleteSKU: (id: string) => Promise<void>;

  // 원가 변경 (이력 추적)
  updateCostPrice: (id: string, newCost: number, reason?: string) => Promise<void>;
  fetchCostHistory: (skuId: string) => Promise<void>;

  // 채널 매핑
  fetchChannelMappings: (skuId?: string) => Promise<void>;
  addChannelMapping: (mapping: Omit<ChannelOptionMapping, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteChannelMapping: (id: string) => Promise<void>;

  // 통계
  getStats: () => {
    total: number;
    byBrand: Record<string, number>;
    totalCostValue: number;
  };
}

function dbToSKU(record: any): SKUMaster {
  return {
    id: record.id,
    skuCode: record.sku_code,
    productName: record.product_name,
    brand: record.brand,
    category: record.category || undefined,
    costPrice: parseFloat(record.cost_price) || 0,
    sellingPrice: parseFloat(record.selling_price) || 0,
    effectiveDate: record.effective_date,
    barcode: record.barcode || undefined,
    supplier: record.supplier || undefined,
    minStock: record.min_stock || 0,
    currentStock: record.current_stock || 0,
    isActive: record.is_active,
    notes: record.notes || undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToCostHistory(record: any): SKUCostHistory {
  return {
    id: record.id,
    skuId: record.sku_id,
    previousCost: record.previous_cost ? parseFloat(record.previous_cost) : undefined,
    newCost: parseFloat(record.new_cost),
    changeReason: record.change_reason || undefined,
    effectiveDate: record.effective_date,
    changedBy: record.changed_by || undefined,
    createdAt: record.created_at,
  };
}

function dbToChannelMapping(record: any): ChannelOptionMapping {
  return {
    id: record.id,
    skuId: record.sku_id,
    channel: record.channel,
    optionName: record.option_name,
    channelProductId: record.channel_product_id || undefined,
    channelOptionId: record.channel_option_id || undefined,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export const useSKUMasterStore = create<SKUMasterState>((set, get) => ({
  skus: [],
  costHistory: [],
  channelMappings: [],
  isLoading: false,
  error: null,

  fetchSKUs: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db
        .from('sku_master')
        .select('*')
        .order('brand', { ascending: true })
        .order('product_name', { ascending: true });

      if (error) throw error;

      const skus = (data || []).map(dbToSKU);
      set({ skus, isLoading: false });
    } catch (error: any) {
      console.error('Fetch SKUs error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addSKU: async (skuData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db
        .from('sku_master')
        .insert({
          sku_code: skuData.skuCode,
          product_name: skuData.productName,
          brand: skuData.brand,
          category: skuData.category || null,
          cost_price: skuData.costPrice,
          selling_price: skuData.sellingPrice,
          effective_date: skuData.effectiveDate,
          barcode: skuData.barcode || null,
          supplier: skuData.supplier || null,
          min_stock: skuData.minStock || 0,
          current_stock: skuData.currentStock || 0,
          is_active: skuData.isActive,
          notes: skuData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSKU = dbToSKU(data);
      set((state) => ({
        skus: [...state.skus, newSKU],
        isLoading: false,
      }));

      // 원가 이력에 초기 등록 기록
      await db.from('sku_cost_history').insert({
        sku_id: newSKU.id,
        new_cost: skuData.costPrice,
        change_reason: '초기 등록',
        effective_date: skuData.effectiveDate,
      });

      return newSKU;
    } catch (error: any) {
      console.error('Add SKU error:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateSKU: async (id, updates) => {
    const previousSKUs = get().skus;

    // 낙관적 업데이트
    set((state) => ({
      skus: state.skus.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    }));

    try {
      const dbUpdates: any = {};
      if (updates.skuCode !== undefined) dbUpdates.sku_code = updates.skuCode;
      if (updates.productName !== undefined) dbUpdates.product_name = updates.productName;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
      if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode || null;
      if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier || null;
      if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
      if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

      const { error } = await db
        .from('sku_master')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Update SKU error:', error);
      set({ skus: previousSKUs, error: error.message });
    }
  },

  deleteSKU: async (id) => {
    const previousSKUs = get().skus;

    set((state) => ({
      skus: state.skus.filter((s) => s.id !== id),
    }));

    try {
      const { error } = await db
        .from('sku_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Delete SKU error:', error);
      set({ skus: previousSKUs, error: error.message });
    }
  },

  updateCostPrice: async (id, newCost, reason) => {
    const sku = get().skus.find((s) => s.id === id);
    if (!sku) return;

    const previousCost = sku.costPrice;
    const effectiveDate = new Date().toISOString().split('T')[0];

    try {
      // 1. SKU 원가 업데이트
      const { error: updateError } = await db
        .from('sku_master')
        .update({
          cost_price: newCost,
          effective_date: effectiveDate,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. 이력 추가
      const { error: historyError } = await db
        .from('sku_cost_history')
        .insert({
          sku_id: id,
          previous_cost: previousCost,
          new_cost: newCost,
          change_reason: reason || null,
          effective_date: effectiveDate,
        });

      if (historyError) throw historyError;

      // 3. 로컬 상태 업데이트
      set((state) => ({
        skus: state.skus.map((s) =>
          s.id === id
            ? { ...s, costPrice: newCost, effectiveDate, updatedAt: new Date().toISOString() }
            : s
        ),
      }));

      // 4. 이력 새로고침
      await get().fetchCostHistory(id);
    } catch (error: any) {
      console.error('Update cost price error:', error);
      set({ error: error.message });
    }
  },

  fetchCostHistory: async (skuId) => {
    try {
      const { data, error } = await db
        .from('sku_cost_history')
        .select('*')
        .eq('sku_id', skuId)
        .order('effective_date', { ascending: false });

      if (error) throw error;

      const history = (data || []).map(dbToCostHistory);
      set({ costHistory: history });
    } catch (error: any) {
      console.error('Fetch cost history error:', error);
    }
  },

  fetchChannelMappings: async (skuId) => {
    try {
      let query = db.from('channel_option_mapping').select('*');

      if (skuId) {
        query = query.eq('sku_id', skuId);
      }

      const { data, error } = await query.order('channel', { ascending: true });

      if (error) throw error;

      const mappings = (data || []).map(dbToChannelMapping);
      set({ channelMappings: mappings });
    } catch (error: any) {
      console.error('Fetch channel mappings error:', error);
    }
  },

  addChannelMapping: async (mappingData) => {
    try {
      const { data, error } = await db
        .from('channel_option_mapping')
        .insert({
          sku_id: mappingData.skuId,
          channel: mappingData.channel,
          option_name: mappingData.optionName,
          channel_product_id: mappingData.channelProductId || null,
          channel_option_id: mappingData.channelOptionId || null,
          is_active: mappingData.isActive,
        })
        .select()
        .single();

      if (error) throw error;

      const newMapping = dbToChannelMapping(data);
      set((state) => ({
        channelMappings: [...state.channelMappings, newMapping],
      }));
    } catch (error: any) {
      console.error('Add channel mapping error:', error);
      set({ error: error.message });
    }
  },

  deleteChannelMapping: async (id) => {
    const previousMappings = get().channelMappings;

    set((state) => ({
      channelMappings: state.channelMappings.filter((m) => m.id !== id),
    }));

    try {
      const { error } = await db
        .from('channel_option_mapping')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Delete channel mapping error:', error);
      set({ channelMappings: previousMappings, error: error.message });
    }
  },

  getStats: () => {
    const skus = get().skus;
    const activeSkus = skus.filter((s) => s.isActive);

    return {
      total: skus.length,
      byBrand: {
        howpapa: skus.filter((s) => s.brand === 'howpapa').length,
        nuccio: skus.filter((s) => s.brand === 'nuccio').length,
      },
      totalCostValue: activeSkus.reduce((sum, s) => sum + (s.costPrice * (s.currentStock || 0)), 0),
    };
  },
}));
