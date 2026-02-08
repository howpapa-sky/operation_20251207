import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Target,
  Zap,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Types
interface BrandStats {
  brandId: string;
  brandCode: 'howpapa' | 'nucio';
  brandName: string;
  brandColor: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  grossProfit: number;
  grossProfitRate: number;
  adCost: number;
  contributionProfit: number;
  contributionProfitRate: number;
}

interface DateRange {
  start: string;
  end: string;
}

// Brand colors
const BRAND_COLORS = {
  howpapa: {
    primary: '#f97316',
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    light: '#fff7ed',
  },
  nucio: {
    primary: '#22c55e',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    light: '#f0fdf4',
  },
};

// Format helpers
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPercent(value: number, showSign = false): string {
  const formatted = Math.abs(value).toFixed(1);
  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
}

// Get default date range (last 7 days)
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

// Brand KPI Card
function BrandKPICard({
  stats,
  previousStats,
}: {
  stats: BrandStats;
  previousStats?: BrandStats;
}) {
  const colors = BRAND_COLORS[stats.brandCode];
  const revenueChange = previousStats
    ? ((stats.revenue - previousStats.revenue) / (previousStats.revenue || 1)) * 100
    : 0;
  const ordersChange = previousStats
    ? ((stats.orders - previousStats.orders) / (previousStats.orders || 1)) * 100
    : 0;

  return (
    <Card className={cn('relative overflow-hidden border-2', colors.border)}>
      {/* Brand header */}
      <div className={cn('px-6 py-4 bg-gradient-to-r', colors.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{stats.brandName}</h3>
              <p className="text-white/80 text-sm">{stats.brandCode.toUpperCase()}</p>
            </div>
          </div>
          <Badge
            className={cn(
              'text-sm font-semibold',
              stats.contributionProfit >= 0
                ? 'bg-white/20 text-white'
                : 'bg-red-500/80 text-white'
            )}
          >
            {stats.contributionProfitRate >= 0 ? '흑자' : '적자'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              결제금액
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.revenue)}
              <span className="text-sm font-normal text-gray-500 ml-1">원</span>
            </p>
            {previousStats && (
              <div className="flex items-center gap-1">
                {revenueChange > 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                ) : revenueChange < 0 ? (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    revenueChange > 0
                      ? 'text-green-600'
                      : revenueChange < 0
                        ? 'text-red-600'
                        : 'text-gray-400'
                  )}
                >
                  {formatPercent(revenueChange, true)}
                </span>
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              주문수
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.orders.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-1">건</span>
            </p>
            {previousStats && (
              <div className="flex items-center gap-1">
                {ordersChange > 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                ) : ordersChange < 0 ? (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    ordersChange > 0
                      ? 'text-green-600'
                      : ordersChange < 0
                        ? 'text-red-600'
                        : 'text-gray-400'
                  )}
                >
                  {formatPercent(ordersChange, true)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profit metrics */}
        <div className={cn('p-4 rounded-xl', colors.bg)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">매출총이익</p>
              <p className={cn('text-lg font-bold', colors.text)}>
                {formatCurrency(stats.grossProfit)}원
              </p>
              <p className="text-xs text-gray-400">
                이익률 {formatPercent(stats.grossProfitRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">공헌이익</p>
              <p
                className={cn(
                  'text-lg font-bold',
                  stats.contributionProfit >= 0 ? colors.text : 'text-red-600'
                )}
              >
                {formatCurrency(stats.contributionProfit)}원
              </p>
              <p className="text-xs text-gray-400">
                이익률 {formatPercent(stats.contributionProfitRate)}
              </p>
            </div>
          </div>
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-400">객단가</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatCurrency(stats.avgOrderValue)}원
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">광고비</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatCurrency(stats.adCost)}원
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">ROAS</p>
            <p className="text-sm font-semibold text-gray-700">
              {stats.adCost > 0
                ? `${((stats.revenue / stats.adCost) * 100).toFixed(0)}%`
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Total KPI Summary
function TotalKPISummary({
  howpapa,
  nucio,
}: {
  howpapa: BrandStats | null;
  nucio: BrandStats | null;
}) {
  const totalRevenue = (howpapa?.revenue || 0) + (nucio?.revenue || 0);
  const totalOrders = (howpapa?.orders || 0) + (nucio?.orders || 0);
  const totalProfit =
    (howpapa?.contributionProfit || 0) + (nucio?.contributionProfit || 0);
  const totalAdCost = (howpapa?.adCost || 0) + (nucio?.adCost || 0);

  const kpis = [
    {
      title: '전체 결제금액',
      value: totalRevenue,
      unit: '원',
      icon: DollarSign,
      color: 'blue',
    },
    {
      title: '전체 주문수',
      value: totalOrders,
      unit: '건',
      icon: ShoppingCart,
      color: 'green',
    },
    {
      title: '전체 광고비',
      value: totalAdCost,
      unit: '원',
      icon: Target,
      color: 'purple',
    },
    {
      title: '전체 공헌이익',
      value: totalProfit,
      unit: '원',
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: totalProfit >= 0 ? 'green' : 'red',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(kpi.value)}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {kpi.unit}
                  </span>
                </p>
              </div>
              <div className={cn('p-3 rounded-full', colorClasses[kpi.color])}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
          {/* Decorative gradient */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r',
              kpi.color === 'blue' && 'from-blue-400 to-blue-600',
              kpi.color === 'green' && 'from-green-400 to-green-600',
              kpi.color === 'purple' && 'from-purple-400 to-purple-600',
              kpi.color === 'red' && 'from-red-400 to-red-600'
            )}
          />
        </Card>
      ))}
    </div>
  );
}

// Brand Comparison Chart
function BrandComparisonChart({
  howpapa,
  nucio,
}: {
  howpapa: BrandStats | null;
  nucio: BrandStats | null;
}) {
  const chartData = [
    {
      metric: '결제금액',
      하우파파: howpapa?.revenue || 0,
      누씨오: nucio?.revenue || 0,
    },
    {
      metric: '매출총이익',
      하우파파: howpapa?.grossProfit || 0,
      누씨오: nucio?.grossProfit || 0,
    },
    {
      metric: '공헌이익',
      하우파파: howpapa?.contributionProfit || 0,
      누씨오: nucio?.contributionProfit || 0,
    },
  ];

  const pieData = [
    { name: '하우파파', value: howpapa?.revenue || 0, color: BRAND_COLORS.howpapa.primary },
    { name: '누씨오', value: nucio?.revenue || 0, color: BRAND_COLORS.nucio.primary },
  ];

  const totalRevenue = (howpapa?.revenue || 0) + (nucio?.revenue || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            브랜드별 매출/이익 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="metric" width={80} />
                <Tooltip
                  formatter={(value: number) => `${formatCurrency(value)}원`}
                />
                <Legend />
                <Bar
                  dataKey="하우파파"
                  fill={BRAND_COLORS.howpapa.primary}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="누씨오"
                  fill={BRAND_COLORS.nucio.primary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-gray-500" />
            매출 비중
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${formatCurrency(value)}원`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {pieData.map((brand) => (
                <div key={brand.name} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: brand.color }}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{brand.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(brand.value)}원
                      <span className="ml-2 text-xs">
                        ({totalRevenue > 0
                          ? ((brand.value / totalRevenue) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
export default function MultiBrandDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);

  const [howpapaStats, setHowpapaStats] = useState<BrandStats | null>(null);
  const [nucioStats, setNucioStats] = useState<BrandStats | null>(null);

  // Fetch brand stats
  const fetchStats = async (range: DateRange) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get brands
      const { data: brands } = await (supabase as any)
        .from('brands')
        .select('*')
        .eq('is_active', true);

      if (!brands || brands.length === 0) {
        throw new Error('브랜드 데이터가 없습니다');
      }

      // Get orders for date range
      const { data: orders, error: ordersError } = await (supabase as any)
        .from('orders_raw')
        .select('*')
        .gte('order_date', range.start)
        .lte('order_date', range.end);

      if (ordersError) throw ordersError;

      // Aggregate by brand
      const brandStatsMap: Record<string, BrandStats> = {};

      for (const brand of brands) {
        // brand_id 매칭 우선, brand_id가 NULL이면 상품명으로 폴백
        const brandOrders = (orders || []).filter(
          (o: any) => {
            if (o.brand_id) return o.brand_id === brand.id;
            // brand_id가 없는 기존 데이터: 상품명 패턴 매칭
            const pn = ((o.product_name as string) || '').toLowerCase();
            if (brand.code === 'howpapa') return pn.includes('하우파파') || pn.includes('howpapa');
            if (brand.code === 'nucio') return pn.includes('누치오') || pn.includes('누씨오') || pn.includes('nucio') || pn.includes('nuccio');
            return false;
          }
        );

        const revenue = brandOrders.reduce(
          (sum: number, o: any) => sum + (Number(o.total_price) || 0),
          0
        );
        const orderCount = brandOrders.length;
        const cost = brandOrders.reduce(
          (sum: number, o: any) =>
            sum + (Number(o.cost_price) || 0) * (Number(o.quantity) || 1),
          0
        );
        const channelFee = brandOrders.reduce(
          (sum: number, o: any) => sum + (Number(o.channel_fee) || 0),
          0
        );
        const shippingFee = brandOrders.reduce(
          (sum: number, o: any) => sum + (Number(o.shipping_fee) || 0),
          0
        );

        const grossProfit = revenue - cost - revenue * 0.0909; // VAT
        const contributionProfit = grossProfit - channelFee - shippingFee;

        brandStatsMap[brand.code] = {
          brandId: brand.id,
          brandCode: brand.code as 'howpapa' | 'nucio',
          brandName: brand.name,
          brandColor: brand.primary_color || '#666',
          revenue,
          orders: orderCount,
          avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
          grossProfit,
          grossProfitRate: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          adCost: 0, // TODO: fetch from ad_spend_daily
          contributionProfit,
          contributionProfitRate:
            revenue > 0 ? (contributionProfit / revenue) * 100 : 0,
        };
      }

      setHowpapaStats(brandStatsMap['howpapa'] || null);
      setNucioStats(brandStatsMap['nucio'] || null);
    } catch (err: any) {
      console.error('MultiBrandDashboard fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(dateRange);
  }, []);

  const handleDateApply = () => {
    const newRange = { start: startDate, end: endDate };
    setDateRange(newRange);
    fetchStats(newRange);
  };

  const handleQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const newRange = { start: fmt(start), end: fmt(end) };
    setStartDate(newRange.start);
    setEndDate(newRange.end);
    setDateRange(newRange);
    fetchStats(newRange);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-green-500">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            멀티브랜드 대시보드
          </h1>
          <p className="text-gray-500 mt-1">
            하우파파 & 누씨오 실시간 매출 현황
          </p>
        </div>
        <Button onClick={() => fetchStats(dateRange)} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          새로고침
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-gray-400">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
              <Button variant="outline" size="sm" onClick={handleDateApply}>
                적용
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(1)}>
                오늘
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(7)}>
                7일
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(30)}>
                30일
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(90)}>
                90일
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Total KPIs */}
      <TotalKPISummary howpapa={howpapaStats} nucio={nucioStats} />

      {/* Brand Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {howpapaStats ? (
          <BrandKPICard stats={howpapaStats} />
        ) : (
          <Card className="p-8 text-center text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>하우파파 데이터 없음</p>
          </Card>
        )}
        {nucioStats ? (
          <BrandKPICard stats={nucioStats} />
        ) : (
          <Card className="p-8 text-center text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>누씨오 데이터 없음</p>
          </Card>
        )}
      </div>

      {/* Comparison Charts */}
      <BrandComparisonChart howpapa={howpapaStats} nucio={nucioStats} />
    </div>
  );
}
