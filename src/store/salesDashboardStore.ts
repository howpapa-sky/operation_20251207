import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  DailyChannelStats,
  DailyAdStats,
  SalesChannel,
  SalesDashboardStats,
  ProfitBreakdown,
  ChannelSummaryWithComparison,
  calculateContributionProfit,
  calculateProfitBreakdown,
  salesChannelLabels,
} from '../types/ecommerce';
import { useProfitSettingsStore } from './profitSettingsStore';

// Type workaround - 새 테이블들이 아직 타입에 없음
const db = supabase as any;

interface DateRange {
  start: string;
  end: string;
}

interface SalesDashboardState {
  // Data
  channelStats: DailyChannelStats[];
  adStats: DailyAdStats[];
  dashboardStats: SalesDashboardStats | null;
  profitBreakdown: ProfitBreakdown | null;
  channelSummaries: ChannelSummaryWithComparison[];

  // Raw orders (for brand derivation)
  rawOrders: Record<string, unknown>[];

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedDateRange: DateRange;
  selectedChannel: SalesChannel | 'all';
  selectedBrand: 'howpapa' | 'nuccio' | 'all';

  // Actions
  setDateRange: (range: DateRange) => void;
  setSelectedChannel: (channel: SalesChannel | 'all') => void;
  setSelectedBrand: (brand: 'howpapa' | 'nuccio' | 'all') => void;

  fetchDashboardStats: (dateRange?: DateRange) => Promise<void>;

  // 통계 계산
  calculateSummary: () => {
    totalRevenue: number;
    totalCost: number;
    totalOrders: number;
    totalAdCost: number;
    contributionProfit: number;
    roas: number;
    avgOrderValue: number;
  };
}

// 브랜드 추정 (product_name 패턴 매칭)
function deriveBrand(productName: string | undefined): 'howpapa' | 'nuccio' | undefined {
  if (!productName) return undefined;
  const lower = productName.toLowerCase();
  if (lower.includes('하우파파') || lower.includes('howpapa')) return 'howpapa';
  if (lower.includes('누치오') || lower.includes('누씨오') || lower.includes('nuccio')) return 'nuccio';
  return undefined;
}

// SKU 원가 매핑: sku_master의 cost_price를 orders에 적용 (cost_price가 0인 경우)
function enrichOrdersWithSKUCost(
  orders: Record<string, unknown>[],
  skuMap: Map<string, number>
): Record<string, unknown>[] {
  return orders.map(o => {
    const costPrice = Number(o.cost_price) || 0;
    if (costPrice > 0) return o;

    // SKU 매칭: product_name으로 검색
    const productName = (o.product_name as string || '').toLowerCase();
    const skuCost = skuMap.get(productName);

    if (skuCost && skuCost > 0) {
      return { ...o, cost_price: skuCost };
    }
    return o;
  });
}

// orders_raw 레코드를 DailyChannelStats로 집계
function aggregateOrdersByDateChannel(
  orders: Record<string, unknown>[],
  brandFilter?: 'howpapa' | 'nuccio' | 'all'
): DailyChannelStats[] {
  const map = new Map<
    string,
    {
      date: string;
      channel: SalesChannel;
      brand?: 'howpapa' | 'nuccio';
      orders: number;
      quantity: number;
      revenue: number;
      cost: number;
      shipping: number;
      fee: number;
      discount: number;
      profit: number;
    }
  >();

  for (const o of orders) {
    // 취소/반품 주문은 매출에서 제외
    const status = ((o.order_status as string) || '').toUpperCase();
    if (status.includes('CANCEL') || status.includes('RETURN') || status.includes('REFUND')
        || /^[CR]\d/.test(status)) {
      continue;
    }

    const brand = deriveBrand(o.product_name as string);

    // 브랜드 필터
    if (brandFilter && brandFilter !== 'all' && brand !== brandFilter) continue;

    const date = o.order_date as string;
    const channel = o.channel as SalesChannel;
    const key = `${date}::${channel}`;

    const entry = map.get(key) || {
      date,
      channel,
      brand,
      orders: 0,
      quantity: 0,
      revenue: 0,
      cost: 0,
      shipping: 0,
      fee: 0,
      discount: 0,
      profit: 0,
    };

    entry.orders += 1;
    entry.quantity += Number(o.quantity) || 0;
    entry.revenue += Number(o.total_price) || 0;
    entry.cost += (Number(o.cost_price) || 0) * (Number(o.quantity) || 1);
    entry.shipping += Number(o.shipping_fee) || 0;
    entry.fee += Number(o.channel_fee) || 0;
    entry.discount += Number(o.discount_amount) || 0;
    entry.profit += Number(o.profit) || 0;

    map.set(key, entry);
  }

  return Array.from(map.values()).map((e, idx) => ({
    id: `agg-${idx}`,
    date: e.date,
    channel: e.channel,
    brand: e.brand,
    totalOrders: e.orders,
    totalQuantity: e.quantity,
    totalRevenue: e.revenue,
    totalCost: e.cost,
    totalShipping: e.shipping,
    totalFee: e.fee,
    totalDiscount: e.discount,
    grossProfit: e.profit,
    avgOrderValue: e.orders > 0 ? e.revenue / e.orders : 0,
    createdAt: '',
    updatedAt: '',
  }));
}

// 채널별 요약 + 이전 기간 비교 계산
function buildChannelSummaries(
  currentOrders: Record<string, unknown>[],
  previousOrders: Record<string, unknown>[],
  brandFilter?: 'howpapa' | 'nuccio' | 'all'
): ChannelSummaryWithComparison[] {
  const aggregate = (orders: Record<string, unknown>[]) => {
    const map = new Map<SalesChannel, {
      revenue: number;
      orders: number;
      fee: number;
      cost: number;
    }>();

    for (const o of orders) {
      const brand = deriveBrand(o.product_name as string);
      if (brandFilter && brandFilter !== 'all' && brand !== brandFilter) continue;

      const channel = o.channel as SalesChannel;
      const entry = map.get(channel) || { revenue: 0, orders: 0, fee: 0, cost: 0 };
      entry.revenue += Number(o.total_price) || 0;
      entry.orders += 1;
      entry.fee += Number(o.channel_fee) || 0;
      entry.cost += (Number(o.cost_price) || 0) * (Number(o.quantity) || 1);
      map.set(channel, entry);
    }

    return map;
  };

  const currentMap = aggregate(currentOrders);
  const previousMap = aggregate(previousOrders);

  const allChannels = new Set<SalesChannel>([...currentMap.keys(), ...previousMap.keys()]);

  return Array.from(allChannels).map((channel) => {
    const cur = currentMap.get(channel) || { revenue: 0, orders: 0, fee: 0, cost: 0 };
    const prev = previousMap.get(channel) || { revenue: 0, orders: 0, fee: 0, cost: 0 };

    const curGrossProfit = cur.revenue - cur.cost;
    const prevGrossProfit = prev.revenue - prev.cost;

    const pctChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      channel,
      channelName: salesChannelLabels[channel] || channel,
      current: {
        revenue: cur.revenue,
        orders: cur.orders,
        avgOrderValue: cur.orders > 0 ? cur.revenue / cur.orders : 0,
        channelFee: cur.fee,
        grossProfit: curGrossProfit,
        grossProfitRate: cur.revenue > 0 ? (curGrossProfit / cur.revenue) * 100 : 0,
      },
      previous: {
        revenue: prev.revenue,
        orders: prev.orders,
        avgOrderValue: prev.orders > 0 ? prev.revenue / prev.orders : 0,
        channelFee: prev.fee,
        grossProfit: prevGrossProfit,
        grossProfitRate: prev.revenue > 0 ? (prevGrossProfit / prev.revenue) * 100 : 0,
      },
      changes: {
        revenue: pctChange(cur.revenue, prev.revenue),
        orders: pctChange(cur.orders, prev.orders),
        avgOrderValue: pctChange(
          cur.orders > 0 ? cur.revenue / cur.orders : 0,
          prev.orders > 0 ? prev.revenue / prev.orders : 0
        ),
        channelFee: pctChange(cur.fee, prev.fee),
        grossProfit: pctChange(curGrossProfit, prevGrossProfit),
      },
    };
  }).sort((a, b) => b.current.revenue - a.current.revenue);
}

// 이전 기간 날짜 범위 계산
function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);

  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

// 오늘 날짜 기준으로 기본 날짜 범위 (최근 7일)
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// 어제 날짜 범위
function getYesterdayRange(): DateRange {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  return { start: dateStr, end: dateStr };
}

export const useSalesDashboardStore = create<SalesDashboardState>((set, get) => ({
  channelStats: [],
  adStats: [],
  dashboardStats: null,
  profitBreakdown: null,
  channelSummaries: [],
  rawOrders: [],
  isLoading: false,
  error: null,
  selectedDateRange: getDefaultDateRange(),
  selectedChannel: 'all',
  selectedBrand: 'all',

  setDateRange: (range) => {
    set({ selectedDateRange: range });
    get().fetchDashboardStats(range);
  },

  setSelectedChannel: (channel) => {
    set({ selectedChannel: channel });
  },

  setSelectedBrand: (brand) => {
    set({ selectedBrand: brand });
    // Re-calculate with new brand filter
    const { rawOrders, selectedDateRange } = get();
    if (rawOrders.length > 0) {
      const channelStats = aggregateOrdersByDateChannel(rawOrders, brand);
      set({ channelStats });
    }
  },

  fetchDashboardStats: async (dateRange) => {
    const range = dateRange || get().selectedDateRange;
    const prevRange = getPreviousPeriod(range);
    const brandFilter = get().selectedBrand;

    set({ isLoading: true, error: null });

    try {
      // 현재 기간 주문 데이터 조회
      const { data: rawOrders, error: ordersError } = await db
        .from('orders_raw')
        .select('*')
        .gte('order_date', range.start)
        .lte('order_date', range.end)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      // SKU 마스터에서 원가 로드
      let skuMap = new Map<string, number>();
      try {
        const { data: skuData } = await db
          .from('sku_master')
          .select('product_name, cost_price')
          .eq('is_active', true);
        if (skuData) {
          for (const sku of skuData) {
            skuMap.set((sku.product_name as string).toLowerCase(), Number(sku.cost_price) || 0);
          }
        }
      } catch {
        // sku_master 테이블 없으면 무시
      }

      // SKU 원가 적용 (cost_price가 0인 주문에 SKU 원가 매핑)
      const orders = enrichOrdersWithSKUCost(rawOrders || [], skuMap);

      // 이전 기간 주문 데이터 조회
      const { data: prevRawOrders } = await db
        .from('orders_raw')
        .select('*')
        .gte('order_date', prevRange.start)
        .lte('order_date', prevRange.end);

      const prevOrders = enrichOrdersWithSKUCost(prevRawOrders || [], skuMap);

      // 날짜+채널별 집계
      const channelStats = aggregateOrdersByDateChannel(orders, brandFilter);

      // 채널별 요약 + 이전 기간 비교
      const channelSummaries = buildChannelSummaries(orders, prevOrders, brandFilter);

      // 광고 데이터 조회
      let adStats: DailyAdStats[] = [];
      try {
        const { data: adData } = await db
          .from('daily_ad_stats')
          .select('*')
          .gte('date', range.start)
          .lte('date', range.end);

        if (adData && adData.length > 0) {
          adStats = adData.map((record: any) => ({
            id: record.id,
            date: record.date,
            channel: record.channel || undefined,
            totalImpressions: record.total_impressions || 0,
            totalClicks: record.total_clicks || 0,
            totalCost: parseFloat(record.total_cost) || 0,
            totalConversions: record.total_conversions || 0,
            totalConversionValue: parseFloat(record.total_conversion_value) || 0,
            avgCtr: parseFloat(record.avg_ctr) || 0,
            avgCpc: parseFloat(record.avg_cpc) || 0,
            overallRoas: parseFloat(record.overall_roas) || 0,
            createdAt: record.created_at,
          }));
        }
      } catch {
        // 광고 데이터 테이블 미존재 - 무시
      }

      // KPI 계산
      const totalRevenue = channelStats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalCost = channelStats.reduce((sum, s) => sum + s.totalCost, 0);
      const totalOrders = channelStats.reduce((sum, s) => sum + s.totalOrders, 0);
      const totalShipping = channelStats.reduce((sum, s) => sum + s.totalShipping, 0);
      const totalFee = channelStats.reduce((sum, s) => sum + s.totalFee, 0);
      const totalAdCost = adStats.reduce((sum, s) => sum + s.totalCost, 0);
      const totalConversionValue = adStats.reduce((sum, s) => sum + s.totalConversionValue, 0);

      // 3단계 이익 계산
      const profitSettings = useProfitSettingsStore.getState().settings;
      const startDate = new Date(range.start + 'T00:00:00');
      const endDate = new Date(range.end + 'T00:00:00');
      const periodDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

      const profitBreakdown = calculateProfitBreakdown({
        revenue: totalRevenue,
        costOfGoods: totalCost,
        shippingFee: totalShipping,
        channelFee: totalFee,
        adCost: totalAdCost,
        settings: profitSettings,
        orderCount: totalOrders,
        periodDays,
      });

      // 공헌이익 계산 (기존 호환)
      const contributionProfit = calculateContributionProfit({
        revenue: totalRevenue,
        cost: totalCost,
        shippingFee: totalShipping,
        channelFee: totalFee,
        adCost: totalAdCost,
      });

      // ROAS 계산
      const roas = totalAdCost > 0 ? (totalConversionValue / totalAdCost) * 100 : 0;
      const profitRate = totalRevenue > 0 ? (contributionProfit / totalRevenue) * 100 : 0;

      // 전일 대비 변화 계산
      const yesterdayRange = getYesterdayRange();
      const todayStr = new Date().toISOString().split('T')[0];

      const todayStats = channelStats.filter(s => s.date === todayStr);
      const yesterdayStats = channelStats.filter(s => s.date === yesterdayRange.start);

      const todayRevenue = todayStats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const yesterdayRevenue = yesterdayStats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const revenueChange = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

      const todayOrders = todayStats.reduce((sum, s) => sum + s.totalOrders, 0);
      const yesterdayOrders = yesterdayStats.reduce((sum, s) => sum + s.totalOrders, 0);
      const ordersChange = yesterdayOrders > 0
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
        : 0;

      // 전체 광고 통계 합산
      const overallAdStats: DailyAdStats = {
        id: 'overall',
        date: range.end,
        totalImpressions: adStats.reduce((sum, s) => sum + s.totalImpressions, 0),
        totalClicks: adStats.reduce((sum, s) => sum + s.totalClicks, 0),
        totalCost: totalAdCost,
        totalConversions: adStats.reduce((sum, s) => sum + s.totalConversions, 0),
        totalConversionValue,
        avgCtr: 0,
        avgCpc: 0,
        overallRoas: roas,
        createdAt: new Date().toISOString(),
      };

      if (overallAdStats.totalImpressions > 0) {
        overallAdStats.avgCtr = (overallAdStats.totalClicks / overallAdStats.totalImpressions) * 100;
      }
      if (overallAdStats.totalClicks > 0) {
        overallAdStats.avgCpc = totalAdCost / overallAdStats.totalClicks;
      }

      const dashboardStats: SalesDashboardStats = {
        totalRevenue,
        totalOrders,
        totalAdCost,
        totalConversionValue,
        roas,
        contributionProfit,
        profitRate,
        revenueChange,
        ordersChange,
        profitChange: 0,
        byChannel: channelStats,
        adStats: overallAdStats,
      };

      set({
        channelStats,
        adStats,
        dashboardStats,
        profitBreakdown,
        channelSummaries,
        rawOrders: orders,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Fetch dashboard stats error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  calculateSummary: () => {
    const { channelStats, adStats, selectedChannel, selectedBrand } = get();

    // 필터링
    let filteredStats = channelStats;
    if (selectedChannel !== 'all') {
      filteredStats = filteredStats.filter(s => s.channel === selectedChannel);
    }
    if (selectedBrand !== 'all') {
      filteredStats = filteredStats.filter(s => s.brand === selectedBrand);
    }

    const totalRevenue = filteredStats.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = filteredStats.reduce((sum, s) => sum + s.totalCost, 0);
    const totalOrders = filteredStats.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalShipping = filteredStats.reduce((sum, s) => sum + s.totalShipping, 0);
    const totalFee = filteredStats.reduce((sum, s) => sum + s.totalFee, 0);
    const totalAdCost = adStats.reduce((sum, s) => sum + s.totalCost, 0);
    const totalConversionValue = adStats.reduce((sum, s) => sum + s.totalConversionValue, 0);

    const contributionProfit = calculateContributionProfit({
      revenue: totalRevenue,
      cost: totalCost,
      shippingFee: totalShipping,
      channelFee: totalFee,
      adCost: totalAdCost,
    });

    const roas = totalAdCost > 0 ? (totalConversionValue / totalAdCost) * 100 : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalCost,
      totalOrders,
      totalAdCost,
      contributionProfit,
      roas,
      avgOrderValue,
    };
  },
}));
