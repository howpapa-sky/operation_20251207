import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Calendar,
  Store,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Settings,
  LayoutGrid,
  Layers,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSalesDashboardStore } from '@/store/salesDashboardStore';
import { useBrandStore } from '@/store/brandStore';
import {
  SalesChannel,
  salesChannelLabels,
  adChannelLabels,
  AdChannel,
  DailyChannelStats,
  ChannelSummaryWithComparison,
} from '@/types/ecommerce';
import { cn } from '@/lib/utils';
import OrderSyncPanel from '@/components/sales/OrderSyncPanel';
import ProfitBreakdownCard from '@/components/sales/ProfitBreakdownCard';
import MultiBrandDashboard from '@/components/dashboard/MultiBrandDashboard';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'multi-brand' | 'single-brand';

// =====================================================
// CHANNEL_COLORS - SaaS-grade color system
// =====================================================
const CHANNEL_COLORS: Record<string, {
  hex: string;
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  gradient: string;
}> = {
  smartstore: {
    hex: '#22c55e',
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-500',
    gradient: 'from-green-500 to-emerald-600',
  },
  coupang: {
    hex: '#3b82f6',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  coupang_rocket: {
    hex: '#6366f1',
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-500',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  cafe24: {
    hex: '#f97316',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-500',
    gradient: 'from-orange-500 to-orange-600',
  },
  qoo10: {
    hex: '#a855f7',
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-500',
    gradient: 'from-purple-500 to-purple-600',
  },
};

const DEFAULT_CHANNEL_COLOR = {
  hex: '#6b7280',
  bg: 'bg-gray-500',
  bgLight: 'bg-gray-50',
  text: 'text-gray-600',
  border: 'border-gray-500',
  gradient: 'from-gray-500 to-gray-600',
};

function getChannelColor(channel: string) {
  return CHANNEL_COLORS[channel] || DEFAULT_CHANNEL_COLOR;
}

// =====================================================
// Utilities
// =====================================================

function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
      <Button
        variant={viewMode === 'multi-brand' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('multi-brand')}
        className="flex items-center gap-2"
      >
        <LayoutGrid className="w-4 h-4" />
        멀티브랜드
      </Button>
      <Button
        variant={viewMode === 'single-brand' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('single-brand')}
        className="flex items-center gap-2"
      >
        <Layers className="w-4 h-4" />
        상세보기
      </Button>
    </div>
  );
}

function formatCurrency(value: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(value)));
  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (Math.abs(value) >= 10000) return `${Math.round(value / 10000)}만`;
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPercent(value: number, showSign = false): string {
  const formatted = Math.abs(value).toFixed(1);
  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
}

// =====================================================
// KPI Card (Enhanced with bottom gradient bar)
// =====================================================
function KPICard({
  title,
  value,
  unit = '원',
  change,
  changeLabel = '전일대비',
  icon: Icon,
  color = 'blue',
}: {
  title: string;
  value: number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: { icon: 'bg-blue-50 text-blue-600', bar: 'from-blue-400 to-blue-600' },
    green: { icon: 'bg-green-50 text-green-600', bar: 'from-green-400 to-green-600' },
    orange: { icon: 'bg-orange-50 text-orange-600', bar: 'from-orange-400 to-orange-600' },
    purple: { icon: 'bg-purple-50 text-purple-600', bar: 'from-purple-400 to-purple-600' },
    red: { icon: 'bg-red-50 text-red-600', bar: 'from-red-400 to-red-600' },
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{formatCurrency(value)}</span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {change > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : change < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <span
                  className={cn(
                    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                  )}
                >
                  {formatPercent(change, true)}
                </span>
                <span className="text-gray-400">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-full', colorClasses[color].icon)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r',
          colorClasses[color].bar
        )}
      />
    </Card>
  );
}

// =====================================================
// Channel Performance Card (with sparkline & share bar)
// =====================================================
function ChannelPerformanceCard({
  channel,
  channelName,
  revenue,
  orders,
  revenueChange,
  sharePercent,
  dailyData,
  isSelected,
  onClick,
}: {
  channel: string;
  channelName: string;
  revenue: number;
  orders: number;
  revenueChange: number;
  sharePercent: number;
  dailyData: { date: string; revenue: number }[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const colors = getChannelColor(channel);

  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected ? 'ring-2 ring-offset-1' : 'border'
      )}
      style={
        isSelected ? ({ '--tw-ring-color': colors.hex } as React.CSSProperties) : undefined
      }
      onClick={onClick}
    >
      {/* Top color strip */}
      <div className={cn('h-1.5 bg-gradient-to-r', colors.gradient)} />

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', colors.bg)} />
            <h4 className="font-semibold text-gray-900 text-sm">{channelName}</h4>
          </div>
          {isSelected && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              선택됨
            </Badge>
          )}
        </div>

        {/* Revenue */}
        <div className="mb-1">
          <span className="text-2xl font-bold text-gray-900">
            {formatCompact(revenue)}
          </span>
          <span className="text-sm text-gray-500 ml-1">원</span>
        </div>

        {/* Change indicators */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 text-xs">
            {revenueChange > 0 ? (
              <ArrowUpRight className="w-3 h-3 text-green-500" />
            ) : revenueChange < 0 ? (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            ) : (
              <Minus className="w-3 h-3 text-gray-400" />
            )}
            <span
              className={cn(
                'font-medium',
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
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">
            {orders.toLocaleString()}건
          </span>
        </div>

        {/* Sparkline */}
        {dailyData.length > 1 && (
          <div className="h-10 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient
                    id={`spark-${channel}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={colors.hex} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colors.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={colors.hex}
                  fill={`url(#spark-${channel})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Share progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">매출 점유율</span>
            <span className={cn('font-semibold', colors.text)}>
              {sharePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                colors.gradient
              )}
              style={{ width: `${Math.min(sharePercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Revenue Trend Chart (multi-channel area chart)
// =====================================================
type TrendPeriod = 'daily' | 'weekly' | 'monthly';

function RevenueTrendChart({
  channelStats,
  selectedChannel,
}: {
  channelStats: DailyChannelStats[];
  selectedChannel: SalesChannel | 'all';
}) {
  const [period, setPeriod] = useState<TrendPeriod>('daily');

  const { chartData, channels } = useMemo(() => {
    const channelSet = new Set<string>();
    channelStats.forEach((s) => channelSet.add(s.channel));
    const channels = Array.from(channelSet).sort();

    const dateMap = new Map<string, Record<string, number>>();
    for (const stat of channelStats) {
      let key = stat.date;

      if (period === 'weekly') {
        const d = new Date(stat.date + 'T00:00:00');
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((day + 6) % 7));
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (period === 'monthly') {
        key = stat.date.substring(0, 7);
      }

      const entry = dateMap.get(key) || {};
      entry[stat.channel] = (entry[stat.channel] || 0) + stat.totalRevenue;
      entry['total'] = (entry['total'] || 0) + stat.totalRevenue;
      dateMap.set(key, entry);
    }

    const chartData = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: period === 'monthly' ? date : date.substring(5),
        ...values,
      }));

    return { chartData, channels };
  }, [channelStats, period]);

  const visibleChannels =
    selectedChannel === 'all'
      ? channels
      : channels.filter((c) => c === selectedChannel);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[200px]">
        <p className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b">
          {label}
        </p>
        {[...payload]
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry) => (
            <div
              key={entry.name}
              className="flex items-center justify-between gap-4 py-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">
                  {salesChannelLabels[entry.name as SalesChannel] || entry.name}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatCompact(entry.value)}원
              </span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            매출 추이
          </CardTitle>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {(
              [
                ['daily', '일별'],
                ['weekly', '주별'],
                ['monthly', '월별'],
              ] as [TrendPeriod, string][]
            ).map(([p, label]) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setPeriod(p)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                {visibleChannels.map((ch) => (
                  <linearGradient
                    key={ch}
                    id={`trend-${ch}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={getChannelColor(ch).hex}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor={getChannelColor(ch).hex}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(v)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              {visibleChannels.map((ch) => (
                <Area
                  key={ch}
                  type="monotone"
                  dataKey={ch}
                  name={ch}
                  stroke={getChannelColor(ch).hex}
                  fill={`url(#trend-${ch})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                />
              ))}
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">
                    {salesChannelLabels[value as SalesChannel] || value}
                  </span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Channel Comparison Table (sortable)
// =====================================================
type SortField =
  | 'revenue'
  | 'orders'
  | 'avgOrderValue'
  | 'grossProfitRate'
  | 'grossProfit';
type SortDir = 'asc' | 'desc';

function ChangeInline({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) return null;
  return (
    <span
      className={cn(
        'block text-[10px] font-medium',
        value > 0 ? 'text-green-600' : 'text-red-500'
      )}
    >
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function ChannelComparisonTable({
  channelSummaries,
  onChannelClick,
  selectedChannel,
}: {
  channelSummaries: ChannelSummaryWithComparison[];
  onChannelClick: (channel: SalesChannel | 'all') => void;
  selectedChannel: SalesChannel | 'all';
}) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const totalRevenue = channelSummaries.reduce(
    (sum, ch) => sum + ch.current.revenue,
    0
  );

  const sorted = useMemo(() => {
    return [...channelSummaries].sort((a, b) => {
      const aVal = a.current[sortField];
      const bVal = b.current[sortField];
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [channelSummaries, sortField, sortDir]);

  const topChannel = sorted.length > 0 ? sorted[0].channel : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <th
      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        {sortField === field ? (
          sortDir === 'desc' ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  if (channelSummaries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-600" />
          채널 비교 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-y border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  채널
                </th>
                <SortHeader field="revenue">매출</SortHeader>
                <SortHeader field="orders">주문수</SortHeader>
                <SortHeader field="avgOrderValue">객단가</SortHeader>
                <SortHeader field="grossProfitRate">이익률</SortHeader>
                <SortHeader field="grossProfit">매출총이익</SortHeader>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  점유율
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((ch) => {
                const colors = getChannelColor(ch.channel);
                const share =
                  totalRevenue > 0
                    ? (ch.current.revenue / totalRevenue) * 100
                    : 0;
                const isTop = ch.channel === topChannel;
                const isActive = selectedChannel === ch.channel;

                return (
                  <tr
                    key={ch.channel}
                    className={cn(
                      'hover:bg-gray-50/50 transition-colors cursor-pointer',
                      isActive && 'bg-blue-50/50',
                      isTop && !isActive && 'bg-amber-50/30'
                    )}
                    onClick={() =>
                      onChannelClick(isActive ? 'all' : ch.channel)
                    }
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-3 h-3 rounded-full', colors.bg)} />
                        <span className="font-medium text-gray-900 text-sm">
                          {ch.channelName}
                        </span>
                        {isTop && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700"
                          >
                            TOP
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {formatCompact(ch.current.revenue)}원
                        </span>
                        <ChangeInline value={ch.changes.revenue} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          {ch.current.orders.toLocaleString()}건
                        </span>
                        <ChangeInline value={ch.changes.orders} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-gray-700">
                        {formatCompact(ch.current.avgOrderValue)}원
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'text-sm font-medium px-2 py-0.5 rounded-full',
                          ch.current.grossProfitRate >= 20
                            ? 'bg-green-100 text-green-700'
                            : ch.current.grossProfitRate >= 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        )}
                      >
                        {ch.current.grossProfitRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'font-medium text-sm',
                          ch.current.grossProfit >= 0
                            ? 'text-gray-900'
                            : 'text-red-600'
                        )}
                      >
                        {formatCompact(ch.current.grossProfit)}원
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full bg-gradient-to-r',
                              colors.gradient
                            )}
                            style={{
                              width: `${Math.min(share, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50/80 border-t border-gray-200">
              <tr className="font-semibold">
                <td className="px-4 py-3 text-sm text-gray-700">전체</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {formatCompact(
                    channelSummaries.reduce(
                      (s, c) => s + c.current.revenue,
                      0
                    )
                  )}
                  원
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {channelSummaries
                    .reduce((s, c) => s + c.current.orders, 0)
                    .toLocaleString()}
                  건
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">
                  -
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">
                  -
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {formatCompact(
                    channelSummaries.reduce(
                      (s, c) => s + c.current.grossProfit,
                      0
                    )
                  )}
                  원
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Ad Performance Card
// =====================================================
function AdPerformanceCard({
  channel,
  cost,
  conversions,
  conversionValue,
  roas,
  clicks,
  ctr,
}: {
  channel?: AdChannel | string;
  cost: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  clicks: number;
  ctr: number;
}) {
  const channelName = channel
    ? adChannelLabels[channel as AdChannel] || channel
    : '전체 광고';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-purple-500" />
            {channelName}
          </h4>
          <Badge variant={roas >= 100 ? 'default' : 'secondary'}>
            ROAS {formatPercent(roas)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">광고비</p>
            <p className="font-semibold">{formatCurrency(cost)}원</p>
          </div>
          <div>
            <p className="text-gray-500">전환매출</p>
            <p className="font-semibold">{formatCurrency(conversionValue)}원</p>
          </div>
          <div>
            <p className="text-gray-500">전환수</p>
            <p className="font-semibold">{conversions}건</p>
          </div>
          <div>
            <p className="text-gray-500">클릭 / CTR</p>
            <p className="font-semibold">
              {clicks} / {formatPercent(ctr)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Main Page Component
// =====================================================
export default function SalesDashboardPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('multi-brand');

  const {
    dashboardStats,
    channelStats,
    adStats,
    profitBreakdown,
    channelSummaries,
    isLoading,
    error,
    selectedDateRange,
    selectedChannel,
    selectedBrand,
    setDateRange,
    setSelectedChannel,
    setSelectedBrand,
    fetchDashboardStats,
  } = useSalesDashboardStore();

  const { selectedBrandId, getBrandById } = useBrandStore();

  const [startDate, setStartDate] = useState(selectedDateRange.start);
  const [endDate, setEndDate] = useState(selectedDateRange.end);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Sync with global brand selector when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      const brand = getBrandById(selectedBrandId);
      if (brand && (brand.code === 'howpapa' || brand.code === 'nuccio')) {
        if (selectedBrand !== brand.code) {
          setSelectedBrand(brand.code);
          fetchDashboardStats();
        }
      }
    } else if (selectedBrand !== 'all') {
      setSelectedBrand('all');
      fetchDashboardStats();
    }
  }, [selectedBrandId]);

  // Show MultiBrandDashboard as default
  if (viewMode === 'multi-brand') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <MultiBrandDashboard />
      </div>
    );
  }

  const handleDateRangeApply = () => {
    setDateRange({ start: startDate, end: endDate });
  };

  const handleQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const newRange = {
      start: fmt(start),
      end: fmt(end),
    };

    setStartDate(newRange.start);
    setEndDate(newRange.end);
    setDateRange(newRange);
  };

  const handleChannelClick = (channel: SalesChannel | 'all') => {
    setSelectedChannel(channel);
  };

  // Total revenue for share %
  const totalRevenue = channelSummaries.reduce(
    (sum, ch) => sum + ch.current.revenue,
    0
  );

  // Build daily data per channel for sparklines
  const dailyByChannel = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number }[]>();
    const dateChannelMap = new Map<string, Map<string, number>>();

    for (const stat of channelStats) {
      if (!dateChannelMap.has(stat.channel)) {
        dateChannelMap.set(stat.channel, new Map());
      }
      const channelMap = dateChannelMap.get(stat.channel)!;
      channelMap.set(
        stat.date,
        (channelMap.get(stat.date) || 0) + stat.totalRevenue
      );
    }

    for (const [channel, dateMap] of dateChannelMap) {
      const data = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));
      map.set(channel, data);
    }
    return map;
  }, [channelStats]);

  // Ad summaries
  const adSummaries = (() => {
    const summary: Record<
      string,
      {
        cost: number;
        conversions: number;
        conversionValue: number;
        clicks: number;
        impressions: number;
      }
    > = {};

    adStats.forEach((stat) => {
      const ch = stat.channel || 'total';
      if (!summary[ch]) {
        summary[ch] = {
          cost: 0,
          conversions: 0,
          conversionValue: 0,
          clicks: 0,
          impressions: 0,
        };
      }
      summary[ch].cost += stat.totalCost;
      summary[ch].conversions += stat.totalConversions;
      summary[ch].conversionValue += stat.totalConversionValue;
      summary[ch].clicks += stat.totalClicks;
      summary[ch].impressions += stat.totalImpressions;
    });

    return Object.entries(summary).map(([channel, data]) => ({
      channel,
      cost: data.cost,
      conversions: data.conversions,
      conversionValue: data.conversionValue,
      roas: data.cost > 0 ? (data.conversionValue / data.cost) * 100 : 0,
      clicks: data.clicks,
      ctr:
        data.impressions > 0
          ? (data.clicks / data.impressions) * 100
          : 0,
    }));
  })();

  const summary = useSalesDashboardStore.getState().calculateSummary();
  const pb = profitBreakdown;

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-orange-500" />
            매출 대시보드 (상세)
          </h1>
          <p className="text-gray-500 mt-1">
            채널별 매출 현황 및 수익성 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/profit-settings')}
          >
            <Settings className="w-4 h-4 mr-1" />
            이익 설정
          </Button>
          <Button
            onClick={() => fetchDashboardStats()}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')}
            />
            새로고침
          </Button>
        </div>
      </div>

      {/* Filter */}
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleDateRangeApply}
              >
                적용
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickDate(1)}
              >
                오늘
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickDate(7)}
              >
                7일
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickDate(30)}
              >
                30일
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickDate(90)}
              >
                90일
              </Button>
            </div>

            <div className="flex-1" />

            <Select
              value={selectedBrand}
              onValueChange={(v) =>
                setSelectedBrand(v as 'howpapa' | 'nuccio' | 'all')
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 브랜드</SelectItem>
                <SelectItem value="howpapa">하우파파</SelectItem>
                <SelectItem value="nucio">누씨오</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedChannel}
              onValueChange={(v) =>
                setSelectedChannel(v as SalesChannel | 'all')
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 채널</SelectItem>
                {Object.entries(salesChannelLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Order Sync Panel */}
      <OrderSyncPanel onSyncComplete={() => fetchDashboardStats()} brandId={selectedBrandId || undefined} />

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 결제금액"
          value={summary.totalRevenue}
          unit="원"
          change={dashboardStats?.revenueChange}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="주문 수"
          value={summary.totalOrders}
          unit="건"
          change={dashboardStats?.ordersChange}
          icon={ShoppingCart}
          color="green"
        />
        <KPICard
          title="광고비"
          value={summary.totalAdCost}
          unit="원"
          icon={Megaphone}
          color="purple"
        />
        <KPICard
          title="공헌이익"
          value={pb?.contributionProfit ?? summary.contributionProfit}
          unit="원"
          icon={
            (pb?.contributionProfit ?? summary.contributionProfit) >= 0
              ? TrendingUp
              : TrendingDown
          }
          color={
            (pb?.contributionProfit ?? summary.contributionProfit) >= 0
              ? 'green'
              : 'red'
          }
        />
      </div>

      {/* Channel Performance Cards */}
      {channelSummaries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-600" />
            채널별 성과
            <span className="text-sm font-normal text-gray-400">
              카드 클릭으로 필터
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {channelSummaries.map((ch) => (
              <ChannelPerformanceCard
                key={ch.channel}
                channel={ch.channel}
                channelName={ch.channelName}
                revenue={ch.current.revenue}
                orders={ch.current.orders}
                revenueChange={ch.changes.revenue}
                sharePercent={
                  totalRevenue > 0
                    ? (ch.current.revenue / totalRevenue) * 100
                    : 0
                }
                dailyData={dailyByChannel.get(ch.channel) || []}
                isSelected={selectedChannel === ch.channel}
                onClick={() =>
                  handleChannelClick(
                    selectedChannel === ch.channel ? 'all' : ch.channel
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {channelStats.length > 0 && (
        <RevenueTrendChart
          channelStats={channelStats}
          selectedChannel={selectedChannel}
        />
      )}

      {/* Channel Comparison Table */}
      {channelSummaries.length > 0 && (
        <ChannelComparisonTable
          channelSummaries={channelSummaries}
          onChannelClick={handleChannelClick}
          selectedChannel={selectedChannel}
        />
      )}

      {/* 3-stage Profit Analysis */}
      {pb && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            이익 분석
            <span className="text-sm font-normal text-gray-400">
              3단계 수익성
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ProfitBreakdownCard
              title="매출총이익"
              profitValue={pb.grossProfit}
              profitRate={pb.grossProfitRate}
              formula="결제금액 - 매출원가 - 부가세"
              details={[
                { label: '결제금액', value: pb.revenue },
                { label: '매출원가', value: pb.costOfGoods, isNegative: true },
                {
                  label: '부가세 (VAT)',
                  value: pb.vat,
                  isNegative: true,
                },
              ]}
              color="blue"
              settingsPath="/sales/profit-settings"
              breakdown={pb}
            />
            <ProfitBreakdownCard
              title="공헌이익"
              profitValue={pb.contributionProfit}
              profitRate={pb.contributionProfitRate}
              formula="매출총이익 - 배송비 - 수수료 - 광고비 - 변동비"
              details={[
                { label: '매출총이익', value: pb.grossProfit },
                {
                  label: '배송비',
                  value: pb.shippingFee,
                  isNegative: true,
                },
                {
                  label: '채널 수수료',
                  value: pb.channelFee,
                  isNegative: true,
                },
                { label: '광고비', value: pb.adCost, isNegative: true },
                {
                  label: '변동판관비',
                  value: pb.variableCost,
                  isNegative: true,
                },
              ]}
              color="green"
              settingsPath="/sales/channels"
              breakdown={pb}
            />
            <ProfitBreakdownCard
              title="순이익"
              profitValue={pb.netProfit}
              profitRate={pb.netProfitRate}
              formula="공헌이익 - 고정판관비 - 고정비VAT"
              details={[
                { label: '공헌이익', value: pb.contributionProfit },
                {
                  label: '고정판관비',
                  value: pb.fixedCost,
                  isNegative: true,
                },
                {
                  label: '고정비 VAT',
                  value: pb.fixedCostVat,
                  isNegative: true,
                },
              ]}
              color="orange"
              settingsPath="/sales/profit-settings"
              breakdown={pb}
            />
          </div>
        </div>
      )}

      {/* Ad Performance */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-600" />
          광고 성과
        </h2>
        {adSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adSummaries.map((ad) => (
              <AdPerformanceCard
                key={ad.channel}
                channel={ad.channel !== 'total' ? ad.channel : undefined}
                cost={ad.cost}
                conversions={ad.conversions}
                conversionValue={ad.conversionValue}
                roas={ad.roas}
                clicks={ad.clicks}
                ctr={ad.ctr}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>선택한 기간에 광고 데이터가 없습니다.</p>
              <p className="text-sm mt-1">
                광고 채널 API 연동 후 데이터가 표시됩니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {!isLoading &&
        channelSummaries.length === 0 &&
        adSummaries.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                아직 매출 데이터가 없습니다
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                판매 채널 API를 연동하거나, 수동으로 주문 데이터를 등록하면 이
                대시보드에서 실시간 매출과 수익성을 확인할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
