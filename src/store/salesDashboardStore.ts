import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  DailyChannelStats,
  DailyAdStats,
  SalesChannel,
  SalesDashboardStats,
  calculateContributionProfit,
} from '../types/ecommerce';

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

// orders_raw 레코드를 DailyChannelStats로 집계
function aggregateOrdersByDateChannel(
  orders: any[]
): DailyChannelStats[] {
  const map = new Map<
    string,
    {
      date: string;
      channel: SalesChannel;
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
    const date = o.order_date;
    const channel = o.channel as SalesChannel;
    const key = `${date}::${channel}`;

    const entry = map.get(key) || {
      date,
      channel,
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
    brand: undefined,
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
  },

  fetchDashboardStats: async (dateRange) => {
    const range = dateRange || get().selectedDateRange;
    set({ isLoading: true, error: null });

    try {
      // orders_raw에서 직접 주문 데이터 조회
      const { data: rawOrders, error: ordersError } = await db
        .from('orders_raw')
        .select('*')
        .gte('order_date', range.start)
        .lte('order_date', range.end)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      const orders = rawOrders || [];

      // 날짜+채널별 집계
      const channelStats = aggregateOrdersByDateChannel(orders);

      // 광고 데이터 조회 (daily_ad_stats 테이블이 있으면 시도)
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
        // 광고 데이터 테이블 미존재 또는 오류 - 무시
      }

      // KPI 계산
      const totalRevenue = channelStats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalCost = channelStats.reduce((sum, s) => sum + s.totalCost, 0);
      const totalOrders = channelStats.reduce((sum, s) => sum + s.totalOrders, 0);
      const totalShipping = channelStats.reduce((sum, s) => sum + s.totalShipping, 0);
      const totalFee = channelStats.reduce((sum, s) => sum + s.totalFee, 0);
      const totalAdCost = adStats.reduce((sum, s) => sum + s.totalCost, 0);
      const totalConversionValue = adStats.reduce((sum, s) => sum + s.totalConversionValue, 0);

      // 공헌이익 계산
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
