import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/apiErrorHandler';
import { Product, SalesRecord, SalesChannel, Brand, SeedingMarketingCost } from '../types';

interface SalesState {
  products: Product[];
  salesRecords: SalesRecord[];
  isLoading: boolean;
  selectedDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  seedingMarketingCost: number;

  // 제품 관련
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // 매출 기록 관련
  fetchSalesRecords: (startDate?: string, endDate?: string) => Promise<void>;
  addSalesRecord: (record: Omit<SalesRecord, 'id' | 'createdAt' | 'totalRevenue' | 'totalCost' | 'profit'>) => Promise<void>;
  updateSalesRecord: (id: string, updates: Partial<SalesRecord>) => Promise<void>;
  deleteSalesRecord: (id: string) => Promise<void>;

  // 날짜 선택
  setSelectedDate: (date: string) => void;
  setSelectedMonth: (month: string) => void;

  // 통계 헬퍼
  getDailySummary: (date: string) => {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    orderCount: number;
    byChannel: Record<SalesChannel, { revenue: number; cost: number; profit: number; count: number }>;
  };
  getMonthlySummary: (month: string) => {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    orderCount: number;
    byChannel: Record<SalesChannel, { revenue: number; cost: number; profit: number; count: number }>;
    dailyData: { date: string; revenue: number; profit: number }[];
  };

  // 시딩 마케팅비 조회
  getSeedingMarketingCost: (startDate: string, endDate: string, brand?: string) => Promise<SeedingMarketingCost>;
}

const channelLabels: Record<SalesChannel, string> = {
  cafe24: '카페24',
  naver_smartstore: '네이버 스마트스토어',
  coupang: '쿠팡',
  other: '기타',
};

export { channelLabels };

export const useSalesStore = create<SalesState>((set, get) => ({
  products: [],
  salesRecords: [],
  isLoading: false,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedMonth: new Date().toISOString().slice(0, 7),
  seedingMarketingCost: 0,

  // 제품 목록 가져오기
  fetchProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        const products: Product[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand as Product['brand'],
          category: p.category as Product['category'],
          sku: p.sku,
          costPrice: Number(p.cost_price),
          sellingPrice: Number(p.selling_price),
          isActive: p.is_active,
          createdAt: p.created_at,
        }));
        set({ products });
      }
    } catch (error) {
      handleApiError(error, '제품 목록 조회');
      console.error('Fetch products error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // 제품 추가
  addProduct: async (productData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: productData.name,
          brand: productData.brand,
          category: productData.category,
          sku: productData.sku,
          cost_price: productData.costPrice,
          selling_price: productData.sellingPrice,
          is_active: productData.isActive,
        })
        .select()
        .single();

      if (!error && data) {
        const product: Product = {
          id: data.id,
          name: data.name,
          brand: data.brand as Product['brand'],
          category: data.category as Product['category'],
          sku: data.sku,
          costPrice: Number(data.cost_price),
          sellingPrice: Number(data.selling_price),
          isActive: data.is_active,
          createdAt: data.created_at,
        };
        set((state) => ({ products: [...state.products, product] }));
      }
    } catch (error) {
      handleApiError(error, '제품 추가');
      console.error('Add product error:', error);
    }
  },

  // 제품 수정
  updateProduct: async (id, updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    try {
      const { error } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', id);

      if (!error) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      }
    } catch (error) {
      handleApiError(error, '제품 수정');
      console.error('Update product error:', error);
    }
  },

  // 제품 삭제
  deleteProduct: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (!error) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      }
    } catch (error) {
      handleApiError(error, '제품 삭제');
      console.error('Delete product error:', error);
    }
  },

  // 매출 기록 가져오기
  fetchSalesRecords: async (startDate?, endDate?) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });
    try {
      let query = supabase
        .from('sales_records')
        .select('*')
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (!error && data) {
        const records: SalesRecord[] = data.map((r) => ({
          id: r.id,
          date: r.date,
          channel: r.channel as SalesChannel,
          productId: r.product_id || '',
          productName: r.product_name,
          quantity: r.quantity,
          unitPrice: Number(r.unit_price),
          costPrice: Number(r.cost_price),
          totalRevenue: Number(r.total_revenue),
          totalCost: Number(r.total_cost),
          profit: Number(r.profit),
          notes: r.notes || undefined,
          createdAt: r.created_at,
        }));
        set({ salesRecords: records });
      }
    } catch (error) {
      handleApiError(error, '주문 데이터 조회');
      console.error('Fetch sales records error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // 매출 기록 추가
  addSalesRecord: async (recordData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sales_records')
        .insert({
          user_id: user.id,
          date: recordData.date,
          channel: recordData.channel,
          product_id: recordData.productId || null,
          product_name: recordData.productName,
          quantity: recordData.quantity,
          unit_price: recordData.unitPrice,
          cost_price: recordData.costPrice,
          notes: recordData.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        const record: SalesRecord = {
          id: data.id,
          date: data.date,
          channel: data.channel as SalesChannel,
          productId: data.product_id || '',
          productName: data.product_name,
          quantity: data.quantity,
          unitPrice: Number(data.unit_price),
          costPrice: Number(data.cost_price),
          totalRevenue: Number(data.total_revenue),
          totalCost: Number(data.total_cost),
          profit: Number(data.profit),
          notes: data.notes || undefined,
          createdAt: data.created_at,
        };
        set((state) => ({
          salesRecords: [record, ...state.salesRecords],
        }));
      }
    } catch (error) {
      handleApiError(error, '매출 기록 추가');
      console.error('Add sales record error:', error);
    }
  },

  // 매출 기록 수정
  updateSalesRecord: async (id, updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.channel !== undefined) dbUpdates.channel = updates.channel;
    if (updates.productId !== undefined) dbUpdates.product_id = updates.productId || null;
    if (updates.productName !== undefined) dbUpdates.product_name = updates.productName;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    try {
      const { data, error } = await supabase
        .from('sales_records')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        set((state) => ({
          salesRecords: state.salesRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  totalRevenue: Number(data.total_revenue),
                  totalCost: Number(data.total_cost),
                  profit: Number(data.profit),
                }
              : r
          ),
        }));
      }
    } catch (error) {
      handleApiError(error, '매출 기록 수정');
      console.error('Update sales record error:', error);
    }
  },

  // 매출 기록 삭제
  deleteSalesRecord: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sales_records')
        .delete()
        .eq('id', id);

      if (!error) {
        set((state) => ({
          salesRecords: state.salesRecords.filter((r) => r.id !== id),
        }));
      }
    } catch (error) {
      handleApiError(error, '매출 기록 삭제');
      console.error('Delete sales record error:', error);
    }
  },

  // 날짜 선택
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // 일별 요약
  getDailySummary: (date) => {
    const records = get().salesRecords.filter((r) => r.date === date);

    const byChannel: Record<SalesChannel, { revenue: number; cost: number; profit: number; count: number }> = {
      cafe24: { revenue: 0, cost: 0, profit: 0, count: 0 },
      naver_smartstore: { revenue: 0, cost: 0, profit: 0, count: 0 },
      coupang: { revenue: 0, cost: 0, profit: 0, count: 0 },
      other: { revenue: 0, cost: 0, profit: 0, count: 0 },
    };

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    records.forEach((r) => {
      totalRevenue += r.totalRevenue;
      totalCost += r.totalCost;
      totalProfit += r.profit;

      if (byChannel[r.channel]) {
        byChannel[r.channel].revenue += r.totalRevenue;
        byChannel[r.channel].cost += r.totalCost;
        byChannel[r.channel].profit += r.profit;
        byChannel[r.channel].count += 1;
      }
    });

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      orderCount: records.length,
      byChannel,
    };
  },

  // 월별 요약
  getMonthlySummary: (month) => {
    const records = get().salesRecords.filter((r) => r.date.startsWith(month));

    const byChannel: Record<SalesChannel, { revenue: number; cost: number; profit: number; count: number }> = {
      cafe24: { revenue: 0, cost: 0, profit: 0, count: 0 },
      naver_smartstore: { revenue: 0, cost: 0, profit: 0, count: 0 },
      coupang: { revenue: 0, cost: 0, profit: 0, count: 0 },
      other: { revenue: 0, cost: 0, profit: 0, count: 0 },
    };

    const dailyMap: Record<string, { revenue: number; profit: number }> = {};
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    records.forEach((r) => {
      totalRevenue += r.totalRevenue;
      totalCost += r.totalCost;
      totalProfit += r.profit;

      if (byChannel[r.channel]) {
        byChannel[r.channel].revenue += r.totalRevenue;
        byChannel[r.channel].cost += r.totalCost;
        byChannel[r.channel].profit += r.profit;
        byChannel[r.channel].count += 1;
      }

      if (!dailyMap[r.date]) {
        dailyMap[r.date] = { revenue: 0, profit: 0 };
      }
      dailyMap[r.date].revenue += r.totalRevenue;
      dailyMap[r.date].profit += r.profit;
    });

    const dailyData = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      orderCount: records.length,
      byChannel,
      dailyData,
    };
  },

  // 시딩 마케팅비 조회
  getSeedingMarketingCost: async (startDate, endDate, brand?) => {
    const empty: SeedingMarketingCost = { productCost: 0, payment: 0, shippingCost: 0, total: 0, count: 0 };
    try {
      // 발송 완료 이상 상태만 대상
      let query = (supabase as any)
        .from('seeding_influencers')
        .select('product_price, quantity, payment, shipping_cost, fee, project_id')
        .in('status', ['shipped', 'guide_sent', 'posted', 'completed']);

      // 날짜 필터: shipped 시점 기준 (shipping JSONB → shipped_at 또는 updated_at 사용)
      // seeding_influencers에는 updated_at이 있으므로 기간 필터로 사용
      if (startDate) query = query.gte('updated_at', startDate + 'T00:00:00');
      if (endDate) query = query.lte('updated_at', endDate + 'T23:59:59');

      const { data, error } = await query;
      if (error || !data) return empty;

      // 브랜드 필터가 있으면 프로젝트 JOIN
      let filteredData = data;
      if (brand && brand !== 'all') {
        const projectIds = [...new Set(data.map((d: Record<string, unknown>) => d.project_id))];
        if (projectIds.length > 0) {
          const { data: projects } = await (supabase as any)
            .from('seeding_projects')
            .select('id, brand')
            .in('id', projectIds)
            .eq('brand', brand);
          const validIds = new Set((projects || []).map((p: Record<string, unknown>) => p.id));
          filteredData = data.filter((d: Record<string, unknown>) => validIds.has(d.project_id));
        }
      }

      let productCost = 0;
      let payment = 0;
      let shippingCost = 0;

      for (const row of filteredData) {
        const qty = Number(row.quantity) || 1;
        const price = Number(row.product_price) || 0;
        productCost += price * qty;
        payment += Number(row.payment) || Number(row.fee) || 0;
        shippingCost += Number(row.shipping_cost) || 0;
      }

      const total = productCost + payment + shippingCost;
      return { productCost, payment, shippingCost, total, count: filteredData.length };
    } catch (err) {
      handleApiError(err, '시딩 마케팅비 조회');
      console.error('getSeedingMarketingCost error:', err);
      return empty;
    }
  },
}));
