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
  Activity,
  Target,
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
// CHANNEL_COLORS - Modern color system
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
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      <button
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
          viewMode === 'multi-brand'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
        onClick={() => setViewMode('multi-brand')}
      >
        <LayoutGrid className="w-4 h-4" />
        멀티브랜드
      </button>
      <button
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
          viewMode === 'single-brand'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
        onClick={() => setViewMode('single-brand')}
      >
        <Layers className="w-4 h-4" />
        상세보기
      </button>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(value)));
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
// KPI Card - Modern with sparkline
// =====================================================
function KPICard({
  title,
  value,
  unit = '원',
  change,
  changeLabel = '전일대비',
  icon: Icon,
  color = 'blue',
  sparkData,
}: {
  title: string;
  value: number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  sparkData?: number[];
}) {
  const colorClasses = {
    blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-600', bar: 'from-blue-500 to-blue-600', sparkColor: '#3b82f6' },
    green: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600', bar: 'from-emerald-500 to-emerald-600', sparkColor: '#10b981' },
    orange: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-600', bar: 'from-orange-500 to-orange-600', sparkColor: '#f97316' },
    purple: { iconBg: 'bg-violet-500/10', iconText: 'text-violet-600', bar: 'from-violet-500 to-violet-600', sparkColor: '#8b5cf6' },
    red: { iconBg: 'bg-red-500/10', iconText: 'text-red-600', bar: 'from-red-500 to-red-600', sparkColor: '#ef4444' },
  };
  const c = colorClasses[color];

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900 tabular-nums">{formatCompact(value)}</span>
              <span className="text-sm text-gray-400 font-medium">{unit}</span>
            </div>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {change > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                ) : change < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-300" />
                )}
                <span
                  className={cn(
                    'text-xs font-semibold',
                    change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-400'
                  )}
                >
                  {formatPercent(change, true)}
                </span>
                <span className="text-[10px] text-gray-300 ml-0.5">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={cn('p-2.5 rounded-xl', c.iconBg)}>
              <Icon className={cn('w-5 h-5', c.iconText)} />
            </div>
            {sparkData && sparkData.length > 1 && (
              <svg width="64" height="24" viewBox="0 0 64 24" className="opacity-50 group-hover:opacity-100 transition-opacity">
                {(() => {
                  const max = Math.max(...sparkData, 1);
                  const min = Math.min(...sparkData, 0);
                  const range = max - min || 1;
                  const points = sparkData.map((v, i) => {
                    const x = (i / (sparkData.length - 1)) * 64;
                    const y = 22 - ((v - min) / range) * 20;
                    return `${x},${y}`;
                  });
                  return (
                    <>
                      <defs>
                        <linearGradient id={`kpi-spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c.sparkColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={c.sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,24 ${points.join(' ')} 64,24`} fill={`url(#kpi-spark-${title})`} />
                      <polyline points={points.join(' ')} fill="none" stroke={c.sparkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>
      </CardContent>
      <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity', c.bar)} />
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
        'relative overflow-hidden cursor-pointer transition-all duration-300 border-0 shadow-sm',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-offset-1 shadow-lg'
      )}
      style={
        isSelected ? ({ '--tw-ring-color': colors.hex } as React.CSSProperties) : undefined
      }
      onClick={onClick}
    >
      {/* Top color strip */}
      <div className={cn('h-1 bg-gradient-to-r', colors.gradient)} />

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', colors.bg)} />
            <h4 className="font-semibold text-gray-900 text-sm">{channelName}</h4>
          </div>
          {isSelected && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100">
              선택됨
            </Badge>
          )}
        </div>

        {/* Revenue */}
        <div className="mb-1">
          <span className="text-xl font-bold text-gray-900 tabular-nums">
            {formatCompact(revenue)}
          </span>
          <span className="text-xs text-gray-400 ml-1">원</span>
        </div>

        {/* Change indicators */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs">
            {revenueChange > 0 ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            ) : revenueChange < 0 ? (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            ) : (
              <Minus className="w-3 h-3 text-gray-300" />
            )}
            <span
              className={cn(
                'font-semibold',
                revenueChange > 0 ? 'text-emerald-600' : revenueChange < 0 ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {formatPercent(revenueChange, true)}
            </span>
          </div>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-400 tabular-nums">{orders.toLocaleString()}건</span>
        </div>

        {/* Sparkline */}
        {dailyData.length > 1 && (
          <div className="h-8 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id={`spark-${channel}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.hex} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colors.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke={colors.hex} fill={`url(#spark-${channel})`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Share progress bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-400">매출 점유율</span>
            <span className={cn('font-bold', colors.text)}>{sharePercent.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500 bg-gradient-to-r', colors.gradient)}
              style={{ width: `${Math.min(sharePercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Revenue Trend Chart
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
      <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl p-4 min-w-[200px]">
        <p className="text-xs font-semibold text-gray-500 mb-2 pb-2 border-b border-gray-100">
          {label}
        </p>
        {[...payload]
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-600">
                  {salesChannelLabels[entry.name as SalesChannel] || entry.name}
                </span>
              </div>
              <span className="text-xs font-bold text-gray-900">{formatCompact(entry.value)}원</span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            매출 추이
          </CardTitle>
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {(
              [
                ['daily', '일별'],
                ['weekly', '주별'],
                ['monthly', '월별'],
              ] as [TrendPeriod, string][]
            ).map(([p, label]) => (
              <button
                key={p}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
                onClick={() => setPeriod(p)}
              >
                {label}
              </button>
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
                  <linearGradient key={ch} id={`trend-${ch}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getChannelColor(ch).hex} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={getChannelColor(ch).hex} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={60} />
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
                  <span className="text-xs text-gray-500">
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
        'block text-[10px] font-semibold',
        value > 0 ? 'text-emerald-600' : 'text-red-500'
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

  const totalRevenue = channelSummaries.reduce((sum, ch) => sum + ch.current.revenue, 0);

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
      className="px-4 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none"
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
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Store className="w-4 h-4 text-gray-400" />
          채널 비교 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  채널
                </th>
                <SortHeader field="revenue">매출</SortHeader>
                <SortHeader field="orders">주문수</SortHeader>
                <SortHeader field="avgOrderValue">객단가</SortHeader>
                <SortHeader field="grossProfitRate">이익률</SortHeader>
                <SortHeader field="grossProfit">매출총이익</SortHeader>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  점유율
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ch) => {
                const colors = getChannelColor(ch.channel);
                const share = totalRevenue > 0 ? (ch.current.revenue / totalRevenue) * 100 : 0;
                const isTop = ch.channel === topChannel;
                const isActive = selectedChannel === ch.channel;

                return (
                  <tr
                    key={ch.channel}
                    className={cn(
                      'hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50',
                      isActive && 'bg-blue-50/30',
                      isTop && !isActive && 'bg-amber-50/20'
                    )}
                    onClick={() => onChannelClick(isActive ? 'all' : ch.channel)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-2.5 h-2.5 rounded-full', colors.bg)} />
                        <span className="font-medium text-gray-900 text-sm">{ch.channelName}</span>
                        {isTop && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 border-0">
                            TOP
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="font-semibold text-gray-900 text-sm tabular-nums">{formatCompact(ch.current.revenue)}원</span>
                        <ChangeInline value={ch.changes.revenue} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <span className="font-medium text-gray-900 text-sm tabular-nums">{ch.current.orders.toLocaleString()}건</span>
                        <ChangeInline value={ch.changes.orders} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-gray-700 tabular-nums">{formatCompact(ch.current.avgOrderValue)}원</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          ch.current.grossProfitRate >= 20
                            ? 'bg-emerald-50 text-emerald-700'
                            : ch.current.grossProfitRate >= 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-600'
                        )}
                      >
                        {ch.current.grossProfitRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'font-medium text-sm tabular-nums',
                          ch.current.grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'
                        )}
                      >
                        {formatCompact(ch.current.grossProfit)}원
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/60">
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">전체</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">
                  {formatCompact(channelSummaries.reduce((s, c) => s + c.current.revenue, 0))}원
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 tabular-nums">
                  {channelSummaries.reduce((s, c) => s + c.current.orders, 0).toLocaleString()}건
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">
                  {formatCompact(channelSummaries.reduce((s, c) => s + c.current.grossProfit, 0))}원
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-400">100%</td>
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" />
            {channelName}
          </h4>
          <Badge
            className={cn(
              'text-[10px] font-semibold border-0',
              roas >= 100
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            ROAS {formatPercent(roas)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">광고비</p>
            <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(cost)}원</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">전환매출</p>
            <p className="font-semibold text-gray-900 tabular-nums">{formatCurrency(conversionValue)}원</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">전환수</p>
            <p className="font-semibold text-gray-900 tabular-nums">{conversions}건</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">클릭 / CTR</p>
            <p className="font-semibold text-gray-900 tabular-nums">
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
  const [activeQuick, setActiveQuick] = useState<number>(7);

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
        <div className="flex items-center justify-between">
          <div />
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <MultiBrandDashboard />
      </div>
    );
  }

  const handleDateRangeApply = () => {
    setActiveQuick(0);
    setDateRange({ start: startDate, end: endDate });
  };

  const handleQuickDate = (days: number) => {
    setActiveQuick(days);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const newRange = { start: fmt(start), end: fmt(end) };

    setStartDate(newRange.start);
    setEndDate(newRange.end);
    setDateRange(newRange);
  };

  const handleChannelClick = (channel: SalesChannel | 'all') => {
    setSelectedChannel(channel);
  };

  // Total revenue for share %
  const totalRevenue = channelSummaries.reduce((sum, ch) => sum + ch.current.revenue, 0);

  // Build daily data per channel for sparklines
  const dailyByChannel = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number }[]>();
    const dateChannelMap = new Map<string, Map<string, number>>();

    for (const stat of channelStats) {
      if (!dateChannelMap.has(stat.channel)) {
        dateChannelMap.set(stat.channel, new Map());
      }
      const channelMap = dateChannelMap.get(stat.channel)!;
      channelMap.set(stat.date, (channelMap.get(stat.date) || 0) + stat.totalRevenue);
    }

    for (const [channel, dateMap] of dateChannelMap) {
      const data = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));
      map.set(channel, data);
    }
    return map;
  }, [channelStats]);

  // Sparkline data for KPI cards
  const dailyRevenueTotals = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const stat of channelStats) {
      dateMap.set(stat.date, (dateMap.get(stat.date) || 0) + stat.totalRevenue);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
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
        summary[ch] = { cost: 0, conversions: 0, conversionValue: 0, clicks: 0, impressions: 0 };
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
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    }));
  })();

  const summary = useSalesDashboardStore.getState().calculateSummary();
  const pb = profitBreakdown;

  return (
    <div className="space-y-6 pb-8">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div />
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            매출 상세 분석
          </h1>
          <p className="text-sm text-gray-400 mt-1">채널별 매출 현황 및 수익성 분석</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/profit-settings')}
            className="text-gray-500 border-gray-200 hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            이익 설정
          </Button>
          <Button
            onClick={() => fetchDashboardStats()}
            disabled={isLoading}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', isLoading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[130px] h-8 text-sm border-gray-200" />
          <span className="text-gray-300">~</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[130px] h-8 text-sm border-gray-200" />
          <Button variant="outline" size="sm" onClick={handleDateRangeApply} className="h-8 text-xs">적용</Button>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {[
            { days: 1, label: '오늘' },
            { days: 7, label: '7일' },
            { days: 30, label: '30일' },
            { days: 90, label: '90일' },
          ].map(({ days, label }) => (
            <button
              key={days}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-all',
                activeQuick === days
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
              onClick={() => handleQuickDate(days)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Select
          value={selectedBrand}
          onValueChange={(v) => setSelectedBrand(v as 'howpapa' | 'nuccio' | 'all')}
        >
          <SelectTrigger className="w-28 h-8 text-sm border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="howpapa">하우파파</SelectItem>
            <SelectItem value="nuccio">누씨오</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedChannel}
          onValueChange={(v) => setSelectedChannel(v as SalesChannel | 'all')}
        >
          <SelectTrigger className="w-32 h-8 text-sm border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 채널</SelectItem>
            {Object.entries(salesChannelLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order Sync Panel */}
      <OrderSyncPanel onSyncComplete={() => fetchDashboardStats()} brandId={selectedBrandId || undefined} />

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 결제금액"
          value={summary.totalRevenue}
          unit="원"
          change={dashboardStats?.revenueChange}
          icon={DollarSign}
          color="blue"
          sparkData={dailyRevenueTotals}
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
          sparkData={dailyRevenueTotals}
        />
      </div>

      {/* Channel Performance Cards */}
      {channelSummaries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-400" />
            채널별 성과
            <span className="text-[10px] font-normal text-gray-300 ml-1">클릭하여 필터</span>
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
                sharePercent={totalRevenue > 0 ? (ch.current.revenue / totalRevenue) * 100 : 0}
                dailyData={dailyByChannel.get(ch.channel) || []}
                isSelected={selectedChannel === ch.channel}
                onClick={() => handleChannelClick(selectedChannel === ch.channel ? 'all' : ch.channel)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {channelStats.length > 0 && (
        <RevenueTrendChart channelStats={channelStats} selectedChannel={selectedChannel} />
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            이익 분석
            <span className="text-[10px] font-normal text-gray-300 ml-1">3단계 수익성</span>
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
                { label: '부가세 (VAT)', value: pb.vat, isNegative: true },
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
                { label: '배송비', value: pb.shippingFee, isNegative: true },
                { label: '채널 수수료', value: pb.channelFee, isNegative: true },
                { label: '광고비', value: pb.adCost, isNegative: true },
                { label: '변동판관비', value: pb.variableCost, isNegative: true },
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
                { label: '고정판관비', value: pb.fixedCost, isNegative: true },
                { label: '고정비 VAT', value: pb.fixedCostVat, isNegative: true },
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-500" />
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
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">선택한 기간에 광고 데이터가 없습니다.</p>
              <p className="text-xs mt-1 text-gray-300">
                광고 채널 API 연동 후 데이터가 표시됩니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && channelSummaries.length === 0 && adSummaries.length === 0 && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <h3 className="text-base font-semibold text-gray-600 mb-1.5">
              아직 매출 데이터가 없습니다
            </h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              판매 채널 API를 연동하거나, 수동으로 주문 데이터를 등록하면 이
              대시보드에서 실시간 매출과 수익성을 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
