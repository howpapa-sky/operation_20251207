import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Product, SalesRecord, SalesChannel, Brand } from '../types';

interface SalesState {
  products: Product[];
  salesRecords: SalesRecord[];
  isLoading: boolean;
  selectedDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  seedingMarketingCost: number;

  // 시딩 마케팅비
  getSeedingMarketingCost: (startDate: string, endDate: string, brand?: Brand) => Promise<number>;

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

  // 시딩 마케팅비 조회
  getSeedingMarketingCost: async (startDate: string, endDate: string, brand?: Brand) => {
    try {
      // 브랜드 필터가 있으면 해당 브랜드의 프로젝트 ID 목록 조회
      let projectIds: string[] | null = null;
      if (brand) {
        const { data: projects } = await supabase
          .from('seeding_projects')
          .select('id')
          .eq('brand', brand);
        projectIds = projects?.map((p: { id: string }) => p.id) || [];
        if (projectIds.length === 0) {
          set({ seedingMarketingCost: 0 });
          return 0;
        }
      }

      // 발송완료 이후 상태의 인플루언서 조회
      let query = supabase
        .from('seeding_influencers')
        .select('product_price, shipping, payment, shipping_cost, project_id')
        .in('status', ['shipped', 'posted', 'completed'])
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (projectIds) {
        query = query.in('project_id', projectIds);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('getSeedingMarketingCost error:', error);
        set({ seedingMarketingCost: 0 });
        return 0;
      }

      // 계산: SUM(product_price * quantity) + SUM(payment) + SUM(shipping_cost)
      let total = 0;
      data.forEach((inf: Record<string, unknown>) => {
        const quantity = (inf.shipping as Record<string, unknown>)?.quantity as number || 1;
        const productPrice = Number(inf.product_price) || 0;
        const payment = Number(inf.payment) || 0;
        const shippingCost = Number(inf.shipping_cost) || 0;
        total += (productPrice * quantity) + payment + shippingCost;
      });

      set({ seedingMarketingCost: total });
      return total;
    } catch (error) {
      console.error('getSeedingMarketingCost error:', error);
      set({ seedingMarketingCost: 0 });
      return 0;
    }
  },

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
}));
