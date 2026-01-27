import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  DailyChannelStats,
  DailyAdStats,
  SalesChannel,
  AdChannel,
  SalesDashboardStats,
  calculateContributionProfit
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

  fetchChannelStats: (dateRange?: DateRange) => Promise<void>;
  fetchAdStats: (dateRange?: DateRange) => Promise<void>;
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

function dbToChannelStats(record: any): DailyChannelStats {
  return {
    id: record.id,
    date: record.date,
    channel: record.channel,
    brand: record.brand || undefined,
    totalOrders: record.total_orders || 0,
    totalQuantity: record.total_quantity || 0,
    totalRevenue: parseFloat(record.total_revenue) || 0,
    totalCost: parseFloat(record.total_cost) || 0,
    totalShipping: parseFloat(record.total_shipping) || 0,
    totalFee: parseFloat(record.total_fee) || 0,
    totalDiscount: parseFloat(record.total_discount) || 0,
    grossProfit: parseFloat(record.gross_profit) || 0,
    avgOrderValue: parseFloat(record.avg_order_value) || 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToAdStats(record: any): DailyAdStats {
  return {
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

// 전주 동일 기간
function getPreviousWeekRange(currentRange: DateRange): DateRange {
  const startDate = new Date(currentRange.start);
  const endDate = new Date(currentRange.end);

  startDate.setDate(startDate.getDate() - 7);
  endDate.setDate(endDate.getDate() - 7);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
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
    // 날짜 변경 시 자동 새로고침
    get().fetchDashboardStats(range);
  },

  setSelectedChannel: (channel) => {
    set({ selectedChannel: channel });
  },

  setSelectedBrand: (brand) => {
    set({ selectedBrand: brand });
  },

  fetchChannelStats: async (dateRange) => {
    const range = dateRange || get().selectedDateRange;

    try {
      let query = db
        .from('daily_channel_stats')
        .select('*')
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).map(dbToChannelStats);
      set({ channelStats: stats });
    } catch (error: any) {
      console.error('Fetch channel stats error:', error);
      set({ error: error.message });
    }
  },

  fetchAdStats: async (dateRange) => {
    const range = dateRange || get().selectedDateRange;

    try {
      const { data, error } = await db
        .from('daily_ad_stats')
        .select('*')
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date', { ascending: false });

      if (error) throw error;

      const stats = (data || []).map(dbToAdStats);
      set({ adStats: stats });
    } catch (error: any) {
      console.error('Fetch ad stats error:', error);
      set({ error: error.message });
    }
  },

  fetchDashboardStats: async (dateRange) => {
    const range = dateRange || get().selectedDateRange;
    set({ isLoading: true, error: null });

    try {
      // 병렬로 데이터 가져오기
      const [channelResult, adResult] = await Promise.all([
        db
          .from('daily_channel_stats')
          .select('*')
          .gte('date', range.start)
          .lte('date', range.end),
        db
          .from('daily_ad_stats')
          .select('*')
          .gte('date', range.start)
          .lte('date', range.end),
      ]);

      if (channelResult.error) throw channelResult.error;
      if (adResult.error) throw adResult.error;

      const channelStats: DailyChannelStats[] = (channelResult.data || []).map(dbToChannelStats);
      const adStats: DailyAdStats[] = (adResult.data || []).map(dbToAdStats);

      // KPI 계산
      const totalRevenue = channelStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalRevenue, 0);
      const totalCost = channelStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalCost, 0);
      const totalOrders = channelStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalOrders, 0);
      const totalShipping = channelStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalShipping, 0);
      const totalFee = channelStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalFee, 0);
      const totalAdCost = adStats.reduce((sum: number, s: DailyAdStats) => sum + s.totalCost, 0);
      const totalConversionValue = adStats.reduce((sum: number, s: DailyAdStats) => sum + s.totalConversionValue, 0);

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

      // 전일 대비 변화 계산 (간단히 어제 데이터와 비교)
      const yesterdayRange = getYesterdayRange();
      const todayStr = new Date().toISOString().split('T')[0];

      const todayStats = channelStats.filter((s: DailyChannelStats) => s.date === todayStr);
      const yesterdayStats = channelStats.filter((s: DailyChannelStats) => s.date === yesterdayRange.start);

      const todayRevenue = todayStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalRevenue, 0);
      const yesterdayRevenue = yesterdayStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalRevenue, 0);
      const revenueChange = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

      const todayOrders = todayStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalOrders, 0);
      const yesterdayOrders = yesterdayStats.reduce((sum: number, s: DailyChannelStats) => sum + s.totalOrders, 0);
      const ordersChange = yesterdayOrders > 0
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
        : 0;

      // 전체 광고 통계 합산
      const overallAdStats: DailyAdStats = {
        id: 'overall',
        date: range.end,
        totalImpressions: adStats.reduce((sum: number, s: DailyAdStats) => sum + s.totalImpressions, 0),
        totalClicks: adStats.reduce((sum: number, s: DailyAdStats) => sum + s.totalClicks, 0),
        totalCost: totalAdCost,
        totalConversions: adStats.reduce((sum: number, s: DailyAdStats) => sum + s.totalConversions, 0),
        totalConversionValue,
        avgCtr: 0,
        avgCpc: 0,
        overallRoas: roas,
        createdAt: new Date().toISOString(),
      };

      // CTR, CPC 평균 계산
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
        profitChange: 0, // TODO: 계산 추가
        byChannel: channelStats,
        adStats: overallAdStats,
      };

      set({
        channelStats,
        adStats,
        dashboardStats,
        isLoading: false
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
