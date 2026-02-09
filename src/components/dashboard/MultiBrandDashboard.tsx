import { useEffect, useState, useMemo, useCallback } from 'react';
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
  Target,
  Award,
  Store,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { syncAdSpend } from '@/services/adSyncService';
import type { AdPlatform } from '@/types/ecommerce';

// ─── Constants ───────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  smartstore: '스마트스토어',
  coupang: '쿠팡',
  coupang_rocket: '쿠팡 로켓',
  cafe24: 'Cafe24',
  qoo10: '큐텐',
};

const CHANNEL_COLORS: Record<string, string> = {
  smartstore: '#22c55e',
  coupang: '#3b82f6',
  coupang_rocket: '#6366f1',
  cafe24: '#f97316',
  qoo10: '#a855f7',
};

const AD_PLATFORM_LABELS: Record<string, string> = {
  naver_sa: '네이버 검색광고',
  naver_gfa: '네이버 GFA',
  meta: '메타 (FB/IG)',
  coupang_ads: '쿠팡 광고',
};

const BRAND_CONFIG = {
  howpapa: {
    name: '하우파파',
    code: 'HOWPAPA',
    primary: '#f97316',
    gradient: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    ringColor: 'ring-orange-500/20',
  },
  nucio: {
    name: '누씨오',
    code: 'NUCIO',
    primary: '#22c55e',
    gradient: 'from-green-500 to-emerald-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    ringColor: 'ring-green-500/20',
  },
};

// ─── Types ───────────────────────────────────────────────

interface DateRange {
  start: string;
  end: string;
}

interface BrandStats {
  brandId: string;
  brandCode: 'howpapa' | 'nucio';
  brandName: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  grossProfit: number;
  grossProfitRate: number;
  adCost: number;
  contributionProfit: number;
  contributionProfitRate: number;
}

interface DailyTrendData {
  date: string;
  label: string;
  howpapa: number;
  nucio: number;
  total: number;
}

interface ChannelRow {
  channel: string;
  label: string;
  howpapa: number;
  nucio: number;
  total: number;
  orders: number;
  share: number;
}

interface AdPlatformRow {
  platform: string;
  label: string;
  howpapa: number;
  nucio: number;
  total: number;
  isConfigured: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: fmtDate(start), end: fmtDate(end) };
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (Math.abs(value) >= 10000) return `${Math.round(value / 10000)}만`;
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatFullNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPct(value: number, showSign = false): string {
  const f = Math.abs(value).toFixed(1);
  if (showSign && value !== 0) return value > 0 ? `+${f}%` : `-${f}%`;
  return `${f}%`;
}

function deriveBrand(productName: string | undefined): 'howpapa' | 'nucio' | undefined {
  if (!productName) return undefined;
  const l = productName.toLowerCase();
  if (l.includes('하우파파') || l.includes('howpapa')) return 'howpapa';
  if (l.includes('누치오') || l.includes('누씨오') || l.includes('nucio') || l.includes('nucio')) return 'nucio';
  return undefined;
}

// ─── Sub-Components ──────────────────────────────────────

function MiniKPICard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  color,
  sparkData,
}: {
  title: string;
  value: number;
  unit: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sparkData?: number[];
}) {
  const colorMap: Record<string, { iconBg: string; iconText: string; bar: string; sparkColor: string }> = {
    blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-600', bar: 'from-blue-500 to-blue-600', sparkColor: '#3b82f6' },
    green: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600', bar: 'from-emerald-500 to-emerald-600', sparkColor: '#10b981' },
    purple: { iconBg: 'bg-violet-500/10', iconText: 'text-violet-600', bar: 'from-violet-500 to-violet-600', sparkColor: '#8b5cf6' },
    orange: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-600', bar: 'from-orange-500 to-orange-600', sparkColor: '#f97316' },
    red: { iconBg: 'bg-red-500/10', iconText: 'text-red-600', bar: 'from-red-500 to-red-600', sparkColor: '#ef4444' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white">
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
                <span className={cn(
                  'text-xs font-semibold',
                  change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-400'
                )}>
                  {formatPct(change, true)}
                </span>
                <span className="text-[10px] text-gray-300 ml-0.5">전기대비</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={cn('p-2.5 rounded-xl', c.iconBg)}>
              <Icon className={cn('w-5 h-5', c.iconText)} />
            </div>
            {/* Sparkline SVG */}
            {sparkData && sparkData.length > 1 && (
              <svg width="64" height="24" viewBox="0 0 64 24" className="opacity-60 group-hover:opacity-100 transition-opacity">
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
                        <linearGradient id={`spark-grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c.sparkColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={c.sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={`0,24 ${points.join(' ')} 64,24`}
                        fill={`url(#spark-grad-${title})`}
                      />
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke={c.sparkColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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

function RevenueTrendSection({
  trendData,
}: {
  trendData: DailyTrendData[];
}) {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');

  const chartData = useMemo(() => {
    if (period === 'daily') return trendData;

    const weekMap = new Map<string, { howpapa: number; nucio: number; total: number }>();
    for (const d of trendData) {
      const dt = new Date(d.date + 'T00:00:00');
      const day = dt.getDay();
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - ((day + 6) % 7));
      const key = fmtDate(monday);
      const entry = weekMap.get(key) || { howpapa: 0, nucio: 0, total: 0 };
      entry.howpapa += d.howpapa;
      entry.nucio += d.nucio;
      entry.total += d.total;
      weekMap.set(key, entry);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: date.substring(5),
        ...values,
      }));
  }, [trendData, period]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl p-4 min-w-[180px]">
        <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-gray-600">{entry.name === 'howpapa' ? '하우파파' : '누씨오'}</span>
            </div>
            <span className="text-xs font-bold text-gray-900">{formatCompact(entry.value)}원</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between">
          <span className="text-xs text-gray-500">합계</span>
          <span className="text-xs font-bold text-gray-900">{formatCompact(total)}원</span>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            매출 추이
          </CardTitle>
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {(['daily', 'weekly'] as const).map((p) => (
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
                {p === 'daily' ? '일별' : '주별'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-howpapa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_CONFIG.howpapa.primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={BRAND_CONFIG.howpapa.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-nucio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_CONFIG.nucio.primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={BRAND_CONFIG.nucio.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(v)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="howpapa"
                name="howpapa"
                stackId="revenue"
                stroke={BRAND_CONFIG.howpapa.primary}
                fill="url(#grad-howpapa)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="nucio"
                name="nucio"
                stackId="revenue"
                stroke={BRAND_CONFIG.nucio.primary}
                fill="url(#grad-nucio)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-500">
                    {value === 'howpapa' ? '하우파파' : '누씨오'}
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

function BrandCard({
  stats,
  prevStats,
  dailyRevenue,
}: {
  stats: BrandStats;
  prevStats?: BrandStats;
  dailyRevenue: number[];
}) {
  const config = BRAND_CONFIG[stats.brandCode];
  const revenueChange = prevStats && prevStats.revenue > 0
    ? ((stats.revenue - prevStats.revenue) / prevStats.revenue) * 100
    : 0;

  return (
    <Card className={cn('overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300')}>
      {/* Gradient header */}
      <div className={cn('px-5 py-4 bg-gradient-to-r', config.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{config.name}</h3>
              <p className="text-xs text-white/70 font-medium">{config.code}</p>
            </div>
          </div>
          <Badge className={cn(
            'text-xs font-semibold border-0',
            stats.contributionProfit >= 0 ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'
          )}>
            {stats.contributionProfit >= 0 ? '흑자' : '적자'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Revenue + Orders */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">결제금액</p>
            <p className="text-xl font-bold text-gray-900">{formatCompact(stats.revenue)}<span className="text-xs text-gray-400 ml-0.5">원</span></p>
            {prevStats && (
              <div className="flex items-center gap-0.5 mt-0.5">
                {revenueChange > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : revenueChange < 0 ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-gray-300" />}
                <span className={cn('text-[10px] font-semibold', revenueChange > 0 ? 'text-emerald-600' : revenueChange < 0 ? 'text-red-500' : 'text-gray-400')}>
                  {formatPct(revenueChange, true)}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">주문수</p>
            <p className="text-xl font-bold text-gray-900">{stats.orders.toLocaleString()}<span className="text-xs text-gray-400 ml-0.5">건</span></p>
          </div>
        </div>

        {/* Mini sparkline */}
        {dailyRevenue.length > 1 && (
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue.map((v, i) => ({ i, v }))}>
                <defs>
                  <linearGradient id={`brand-spark-${stats.brandCode}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={config.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={config.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={config.primary} fill={`url(#brand-spark-${stats.brandCode})`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Profit metrics */}
        <div className={cn('p-3 rounded-xl', config.bgLight)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">매출총이익</p>
              <p className={cn('text-base font-bold', config.textColor)}>{formatCompact(stats.grossProfit)}원</p>
              <p className="text-[10px] text-gray-400">{formatPct(stats.grossProfitRate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">공헌이익</p>
              <p className={cn('text-base font-bold', stats.contributionProfit >= 0 ? config.textColor : 'text-red-600')}>
                {formatCompact(stats.contributionProfit)}원
              </p>
              <p className="text-[10px] text-gray-400">{formatPct(stats.contributionProfitRate)}</p>
            </div>
          </div>
        </div>

        {/* Footer metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">객단가</p>
            <p className="text-xs font-semibold text-gray-700">{formatCompact(stats.avgOrderValue)}원</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">광고비</p>
            <p className="text-xs font-semibold text-gray-700">{stats.adCost > 0 ? `${formatCompact(stats.adCost)}원` : '-'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">ROAS</p>
            <p className="text-xs font-semibold text-gray-700">{stats.adCost > 0 ? `${((stats.revenue / stats.adCost) * 100).toFixed(0)}%` : '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelBreakdownSection({ channels, totalRevenue }: { channels: ChannelRow[]; totalRevenue: number }) {
  if (channels.length === 0) return null;

  const pieData = channels.filter(c => c.total > 0).map(c => ({
    name: c.label,
    value: c.total,
    color: CHANNEL_COLORS[c.channel] || '#6b7280',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Donut chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-gray-400" />
            채널별 매출 비중
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    strokeWidth={3}
                    stroke="#fff"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${formatCompact(value)}원`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">합계</p>
                  <p className="text-sm font-bold text-gray-900">{formatCompact(totalRevenue)}원</p>
                </div>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 space-y-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-600">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">{formatCompact(d.value)}원</span>
                  <span className="text-[10px] text-gray-400">
                    {totalRevenue > 0 ? `${((d.value / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="lg:col-span-2 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-400" />
            매출처별 상세
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">채널</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-orange-500">하우파파</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-green-500">누씨오</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">합계</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">비중</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.channel} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[ch.channel] || '#9ca3af' }} />
                        <span className="font-medium text-gray-800">{ch.label}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="font-medium text-gray-900">{ch.howpapa > 0 ? `${formatCompact(ch.howpapa)}원` : '-'}</div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="font-medium text-gray-900">{ch.nucio > 0 ? `${formatCompact(ch.nucio)}원` : '-'}</div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold text-gray-900">
                      {formatCompact(ch.total)}원
                      <div className="text-[10px] text-gray-400 font-normal">{ch.orders}건</div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(ch.share, 100)}%`,
                              backgroundColor: CHANNEL_COLORS[ch.channel] || '#9ca3af',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{ch.share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/80">
                  <td className="py-3 px-4 font-semibold text-gray-700">합계</td>
                  <td className="text-right py-3 px-4 font-semibold text-orange-600">
                    {formatCompact(channels.reduce((s, c) => s + c.howpapa, 0))}원
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-green-600">
                    {formatCompact(channels.reduce((s, c) => s + c.nucio, 0))}원
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-gray-900">{formatCompact(totalRevenue)}원</td>
                  <td className="text-right py-3 px-4 text-xs text-gray-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdCostBreakdown({
  adPlatforms,
  onSync,
  isSyncing,
  syncMessage,
}: {
  adPlatforms: AdPlatformRow[];
  onSync?: () => void;
  isSyncing?: boolean;
  syncMessage?: string;
}) {
  const totalCost = adPlatforms.reduce((s, p) => s + p.total, 0);
  const hasAnyConfig = adPlatforms.some((p) => p.isConfigured);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" />
            광고비 매체별 현황
          </CardTitle>
          {hasAnyConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="h-7 text-xs gap-1.5"
            >
              <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
              {isSyncing ? '동기화 중...' : '광고비 동기화'}
            </Button>
          )}
        </div>
        {syncMessage && (
          <p className={cn(
            'text-xs mt-1',
            syncMessage.includes('실패') || syncMessage.includes('오류') ? 'text-red-500' : 'text-emerald-600'
          )}>
            {syncMessage}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">매체</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-orange-500">하우파파</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-green-500">누씨오</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600">합계</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-400">상태</th>
              </tr>
            </thead>
            <tbody>
              {adPlatforms.map((p) => (
                <tr key={p.platform} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-gray-800">{p.label}</td>
                  <td className="text-right py-3 px-3">
                    {p.howpapa > 0 ? <span className="font-medium">{formatCompact(p.howpapa)}원</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="text-right py-3 px-3">
                    {p.nucio > 0 ? <span className="font-medium">{formatCompact(p.nucio)}원</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="text-right py-3 px-3 font-semibold text-gray-900">
                    {p.total > 0 ? `${formatCompact(p.total)}원` : '-'}
                  </td>
                  <td className="text-center py-3 px-3">
                    {p.isConfigured ? (
                      <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">연동됨</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 font-medium">미연동</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/80">
                <td className="py-3 px-3 font-semibold text-gray-700">합계</td>
                <td className="text-right py-3 px-3 font-semibold text-orange-600">
                  {(() => { const t = adPlatforms.reduce((s, p) => s + p.howpapa, 0); return t > 0 ? `${formatCompact(t)}원` : '-'; })()}
                </td>
                <td className="text-right py-3 px-3 font-semibold text-green-600">
                  {(() => { const t = adPlatforms.reduce((s, p) => s + p.nucio, 0); return t > 0 ? `${formatCompact(t)}원` : '-'; })()}
                </td>
                <td className="text-right py-3 px-3 font-bold text-gray-900">
                  {totalCost > 0 ? `${formatCompact(totalCost)}원` : '-'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {!hasAnyConfig && (
          <p className="text-xs text-gray-400 mt-4 text-center py-2">
            설정 &gt; 광고 API에서 광고 계정을 연동하면 매체별 광고비가 자동 집계됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BrandComparisonBar({
  howpapa,
  nucio,
}: {
  howpapa: BrandStats | null;
  nucio: BrandStats | null;
}) {
  const data = [
    { metric: '결제금액', 하우파파: howpapa?.revenue || 0, 누씨오: nucio?.revenue || 0 },
    { metric: '매출총이익', 하우파파: howpapa?.grossProfit || 0, 누씨오: nucio?.grossProfit || 0 },
    { metric: '공헌이익', 하우파파: howpapa?.contributionProfit || 0, 누씨오: nucio?.contributionProfit || 0 },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          브랜드 비교
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="metric" width={65} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => `${formatFullNumber(value)}원`}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar dataKey="하우파파" fill={BRAND_CONFIG.howpapa.primary} radius={[0, 6, 6, 0]} barSize={16} />
              <Bar dataKey="누씨오" fill={BRAND_CONFIG.nucio.primary} radius={[0, 6, 6, 0]} barSize={16} />
              <Legend
                formatter={(v: string) => <span className="text-xs text-gray-500">{v}</span>}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function MultiBrandDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [activeQuick, setActiveQuick] = useState<number>(7);

  const [howpapaStats, setHowpapaStats] = useState<BrandStats | null>(null);
  const [nucioStats, setNucioStats] = useState<BrandStats | null>(null);
  const [prevHowpapaStats, setPrevHowpapaStats] = useState<BrandStats | null>(null);
  const [prevNucioStats, setPrevNucioStats] = useState<BrandStats | null>(null);
  const [trendData, setTrendData] = useState<DailyTrendData[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [adPlatforms, setAdPlatforms] = useState<AdPlatformRow[]>([]);
  const [isAdSyncing, setIsAdSyncing] = useState(false);
  const [adSyncMessage, setAdSyncMessage] = useState<string>('');

  // 브랜드 ID → code 매핑 (sync에서 사용)
  const [brandMap, setBrandMap] = useState<{ id: string; code: string }[]>([]);
  // 브랜드별 설정된 플랫폼 (sync에서 brand별로 맞는 플랫폼만 호출)
  const [brandPlatformConfig, setBrandPlatformConfig] = useState<Record<string, string[]>>({});

  const fetchStats = useCallback(async (range: DateRange) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: brands } = await (supabase as any).from('brands').select('*').eq('is_active', true);
      if (!brands || brands.length === 0) throw new Error('브랜드 데이터가 없습니다');

      const brandIdToCode: Record<string, string> = {};
      for (const b of brands) brandIdToCode[b.id] = b.code;

      // 브랜드 맵 저장 (ad sync에서 사용)
      setBrandMap(brands.map((b: any) => ({ id: b.id, code: b.code })));

      // Current period orders
      const { data: orders, error: ordersError } = await (supabase as any)
        .from('orders_raw')
        .select('*')
        .gte('order_date', range.start)
        .lte('order_date', range.end);
      if (ordersError) throw ordersError;

      // Previous period orders
      const startD = new Date(range.start + 'T00:00:00Z');
      const endD = new Date(range.end + 'T00:00:00Z');
      const days = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
      const prevEnd = new Date(startD.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
      const prevRange = { start: fmtDate(prevStart), end: fmtDate(prevEnd) };

      const { data: prevOrders } = await (supabase as any)
        .from('orders_raw')
        .select('*')
        .gte('order_date', prevRange.start)
        .lte('order_date', prevRange.end);

      // Helper: aggregate orders for a brand
      const aggregateBrand = (orderList: any[], brand: any) => {
        const brandOrders = (orderList || []).filter((o: any) => {
          if (o.brand_id) return o.brand_id === brand.id;
          const pn = ((o.product_name as string) || '').toLowerCase();
          if (brand.code === 'howpapa') return pn.includes('하우파파') || pn.includes('howpapa');
          if (brand.code === 'nucio') return pn.includes('누치오') || pn.includes('누씨오') || pn.includes('nucio') || pn.includes('nucio');
          return false;
        });

        const revenue = brandOrders.reduce((s: number, o: any) => s + (Number(o.total_price) || 0), 0);
        const orderCount = brandOrders.length;
        const cost = brandOrders.reduce((s: number, o: any) => s + (Number(o.cost_price) || 0) * (Number(o.quantity) || 1), 0);
        const channelFee = brandOrders.reduce((s: number, o: any) => s + (Number(o.channel_fee) || 0), 0);
        const shippingFee = brandOrders.reduce((s: number, o: any) => s + (Number(o.shipping_fee) || 0), 0);
        const grossProfit = revenue - cost - revenue * 0.0909;
        const contributionProfit = grossProfit - channelFee - shippingFee;

        return {
          brandId: brand.id,
          brandCode: brand.code as 'howpapa' | 'nucio',
          brandName: brand.name,
          revenue,
          orders: orderCount,
          avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
          grossProfit,
          grossProfitRate: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          adCost: 0,
          contributionProfit,
          contributionProfitRate: revenue > 0 ? (contributionProfit / revenue) * 100 : 0,
        } as BrandStats;
      };

      const currentStats: Record<string, BrandStats> = {};
      const previousStats: Record<string, BrandStats> = {};

      for (const brand of brands) {
        currentStats[brand.code] = aggregateBrand(orders, brand);
        previousStats[brand.code] = aggregateBrand(prevOrders || [], brand);
      }

      // Daily trend data
      const dailyMap = new Map<string, { howpapa: number; nucio: number }>();
      for (const o of (orders || [])) {
        const date = o.order_date as string;
        if (!date) continue;
        const entry = dailyMap.get(date) || { howpapa: 0, nucio: 0 };
        const brand = o.brand_id ? brandIdToCode[o.brand_id] : deriveBrand(o.product_name as string);
        const price = Number(o.total_price) || 0;
        if (brand === 'howpapa') entry.howpapa += price;
        else if (brand === 'nucio') entry.nucio += price;
        dailyMap.set(date, entry);
      }

      const trend: DailyTrendData[] = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          label: date.substring(5),
          howpapa: vals.howpapa,
          nucio: vals.nucio,
          total: vals.howpapa + vals.nucio,
        }));

      // Channel breakdown
      const channelMap = new Map<string, { howpapa: number; nucio: number; orders: number }>();
      for (const o of (orders || [])) {
        const ch = (o.channel as string) || 'unknown';
        const entry = channelMap.get(ch) || { howpapa: 0, nucio: 0, orders: 0 };
        const brand = o.brand_id ? brandIdToCode[o.brand_id] : deriveBrand(o.product_name as string);
        const price = Number(o.total_price) || 0;
        if (brand === 'howpapa') entry.howpapa += price;
        else if (brand === 'nucio') entry.nucio += price;
        entry.orders += 1;
        channelMap.set(ch, entry);
      }

      const totalRev = Array.from(channelMap.values()).reduce((s, c) => s + c.howpapa + c.nucio, 0);
      const channelRows: ChannelRow[] = Array.from(channelMap.entries())
        .map(([ch, d]) => ({
          channel: ch,
          label: CHANNEL_LABELS[ch] || ch,
          howpapa: d.howpapa,
          nucio: d.nucio,
          total: d.howpapa + d.nucio,
          orders: d.orders,
          share: totalRev > 0 ? ((d.howpapa + d.nucio) / totalRev) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // Ad platforms
      let adPlatformRows: AdPlatformRow[] = [];
      try {
        const brandAdData: Record<string, Map<string, number>> = {};
        const configuredPlatforms = new Set<string>();
        const perBrandConfig: Record<string, string[]> = {};

        for (const brand of brands) {
          brandAdData[brand.code] = new Map();
          const brandConfiguredList: string[] = [];

          const { data: adAccounts, error: adAccountsErr } = await (supabase as any)
            .from('ad_accounts').select('platform, is_active').eq('brand_id', brand.id);
          if (adAccountsErr) {
            console.warn(`[ad] ad_accounts 조회 실패 (${brand.code}):`, adAccountsErr.message);
          } else if (adAccounts) {
            for (const a of adAccounts) {
              if (a.is_active) {
                configuredPlatforms.add(a.platform);
                brandConfiguredList.push(a.platform);
              }
            }
          }
          perBrandConfig[brand.id] = brandConfiguredList;

          const { data: adSpend, error: adSpendErr } = await (supabase as any)
            .from('ad_spend_daily').select('platform, spend')
            .eq('brand_id', brand.id)
            .gte('date', range.start).lte('date', range.end);
          if (adSpendErr) {
            console.warn(`[ad] ad_spend_daily 조회 실패 (${brand.code}):`, adSpendErr.message);
          } else if (adSpend) {
            console.log(`[ad] ${brand.code}: ad_spend_daily ${adSpend.length}건 조회됨`, adSpend);
            for (const row of adSpend) {
              const p = row.platform as string;
              const map = brandAdData[brand.code];
              map.set(p, (map.get(p) || 0) + (Number(row.spend) || 0));
            }
          } else {
            console.log(`[ad] ${brand.code}: ad_spend_daily 0건 (빈 결과)`);
          }
        }

        setBrandPlatformConfig(perBrandConfig);

        adPlatformRows = Object.entries(AD_PLATFORM_LABELS).map(([platform, label]) => ({
          platform,
          label,
          howpapa: brandAdData['howpapa']?.get(platform) || 0,
          nucio: brandAdData['nucio']?.get(platform) || 0,
          total: (brandAdData['howpapa']?.get(platform) || 0) + (brandAdData['nucio']?.get(platform) || 0),
          isConfigured: configuredPlatforms.has(platform),
        }));

        // Update brand stats with ad costs
        for (const brand of brands) {
          const totalAdCost = Array.from(brandAdData[brand.code]?.values() || []).reduce((s, v) => s + v, 0);
          if (currentStats[brand.code]) {
            currentStats[brand.code].adCost = totalAdCost;
          }
        }
      } catch (adError: any) {
        console.warn('[ad] 광고비 데이터 로드 실패:', adError?.message || adError);
      }

      setHowpapaStats(currentStats['howpapa'] || null);
      setNucioStats(currentStats['nucio'] || null);
      setPrevHowpapaStats(previousStats['howpapa'] || null);
      setPrevNucioStats(previousStats['nucio'] || null);
      setTrendData(trend);
      setChannels(channelRows);
      setAdPlatforms(adPlatformRows);
    } catch (err: any) {
      console.error('MultiBrandDashboard fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(dateRange);
  }, [fetchStats, dateRange]);

  const handleDateApply = () => {
    setActiveQuick(0);
    const newRange = { start: startDate, end: endDate };
    setDateRange(newRange);
  };

  const handleQuickDate = (days: number) => {
    setActiveQuick(days);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const newRange = { start: fmtDate(start), end: fmtDate(end) };
    setStartDate(newRange.start);
    setEndDate(newRange.end);
    setDateRange(newRange);
  };

  // Computed values
  const totalRevenue = (howpapaStats?.revenue || 0) + (nucioStats?.revenue || 0);
  const totalOrders = (howpapaStats?.orders || 0) + (nucioStats?.orders || 0);
  const totalAdCost = (howpapaStats?.adCost || 0) + (nucioStats?.adCost || 0);
  const totalProfit = (howpapaStats?.contributionProfit || 0) + (nucioStats?.contributionProfit || 0);

  const prevTotalRevenue = (prevHowpapaStats?.revenue || 0) + (prevNucioStats?.revenue || 0);
  const prevTotalOrders = (prevHowpapaStats?.orders || 0) + (prevNucioStats?.orders || 0);
  const prevTotalProfit = (prevHowpapaStats?.contributionProfit || 0) + (prevNucioStats?.contributionProfit || 0);

  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
  const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
  const profitChange = prevTotalProfit > 0 ? ((totalProfit - prevTotalProfit) / prevTotalProfit) * 100 : 0;

  // Sparkline data for KPI cards
  const dailyTotals = trendData.map((d) => d.total);
  const dailyOrders = useMemo(() => {
    // We don't have daily order counts separate, so derive from trend
    return trendData.map(() => 0); // placeholder
  }, [trendData]);

  const howpapaDailyRevenue = trendData.map((d) => d.howpapa);
  const nucioDailyRevenue = trendData.map((d) => d.nucio);

  // 광고비 동기화 핸들러
  const handleAdSync = useCallback(async () => {
    if (isAdSyncing || brandMap.length === 0) return;

    setIsAdSyncing(true);
    setAdSyncMessage('광고비 데이터 동기화 중...');

    const configuredPlatforms = adPlatforms.filter((p) => p.isConfigured);
    if (configuredPlatforms.length === 0) {
      setAdSyncMessage('연동된 광고 계정이 없습니다.');
      setIsAdSyncing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 각 브랜드별 실제 설정된 플랫폼만 동기화
    const syncTasks: Promise<void>[] = [];

    for (const brand of brandMap) {
      const brandPlatforms = brandPlatformConfig[brand.id] || [];
      for (const platformKey of brandPlatforms) {
        const platformInfo = configuredPlatforms.find((p) => p.platform === platformKey);
        if (!platformInfo) continue;
        syncTasks.push(
          syncAdSpend(
            platformKey as AdPlatform,
            brand.id,
            dateRange.start,
            dateRange.end
          ).then((result) => {
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              errors.push(`${platformInfo.label}: ${result.message}`);
            }
          })
        );
      }
    }

    if (syncTasks.length === 0) {
      setAdSyncMessage('동기화할 광고 플랫폼이 없습니다.');
      setIsAdSyncing(false);
      return;
    }

    await Promise.all(syncTasks);

    if (failCount === 0) {
      setAdSyncMessage(`광고비 동기화 완료 (${successCount}건 성공)`);
    } else if (successCount > 0) {
      setAdSyncMessage(`일부 동기화 완료 (성공 ${successCount}, 실패 ${failCount})`);
    } else {
      setAdSyncMessage(`동기화 실패: ${errors[0] || '알 수 없는 오류'}`);
    }

    setIsAdSyncing(false);

    // 동기화 완료 후 대시보드 새로고침
    fetchStats(dateRange);

    // 5초 후 메시지 제거
    setTimeout(() => setAdSyncMessage(''), 5000);
  }, [isAdSyncing, brandMap, brandPlatformConfig, adPlatforms, dateRange, fetchStats]);

  // 대시보드 로드 시 연동된 광고 계정이 있으면 자동 동기화 (항상 최초 1회 실행)
  const [autoSynced, setAutoSynced] = useState(false);
  useEffect(() => {
    if (autoSynced || isLoading || brandMap.length === 0) return;
    const configured = adPlatforms.filter((p) => p.isConfigured);
    if (configured.length === 0) return;

    setAutoSynced(true);
    handleAdSync();
  }, [autoSynced, isLoading, brandMap, adPlatforms, handleAdSync]);

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-green-500 shadow-lg shadow-orange-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            매출 대시보드
          </h1>
          <p className="text-sm text-gray-400 mt-1">하우파파 & 누씨오 실시간 매출 현황</p>
        </div>
        <Button
          onClick={() => fetchStats(dateRange)}
          disabled={isLoading}
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
        >
          <RefreshCw className={cn('w-4 h-4 mr-1.5', isLoading && 'animate-spin')} />
          새로고침
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[130px] h-8 text-sm border-gray-200" />
          <span className="text-gray-300">~</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[130px] h-8 text-sm border-gray-200" />
          <Button variant="outline" size="sm" onClick={handleDateApply} className="h-8 text-xs">적용</Button>
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
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPICard
          title="총 결제금액"
          value={totalRevenue}
          unit="원"
          change={revenueChange}
          icon={DollarSign}
          color="blue"
          sparkData={dailyTotals}
        />
        <MiniKPICard
          title="총 주문수"
          value={totalOrders}
          unit="건"
          change={ordersChange}
          icon={ShoppingCart}
          color="green"
        />
        <MiniKPICard
          title="총 광고비"
          value={totalAdCost}
          unit="원"
          icon={Target}
          color="purple"
        />
        <MiniKPICard
          title="공헌이익"
          value={totalProfit}
          unit="원"
          change={profitChange}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          color={totalProfit >= 0 ? 'orange' : 'red'}
          sparkData={dailyTotals}
        />
      </div>

      {/* ── Revenue Trend ── */}
      <RevenueTrendSection trendData={trendData} />

      {/* ── Brand Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {howpapaStats ? (
          <BrandCard stats={howpapaStats} prevStats={prevHowpapaStats || undefined} dailyRevenue={howpapaDailyRevenue} />
        ) : (
          <Card className="border-0 shadow-sm p-8 text-center">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">하우파파 데이터 없음</p>
          </Card>
        )}
        {nucioStats ? (
          <BrandCard stats={nucioStats} prevStats={prevNucioStats || undefined} dailyRevenue={nucioDailyRevenue} />
        ) : (
          <Card className="border-0 shadow-sm p-8 text-center">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">누씨오 데이터 없음</p>
          </Card>
        )}
      </div>

      {/* ── Channel Breakdown ── */}
      <ChannelBreakdownSection channels={channels} totalRevenue={totalRevenue} />

      {/* ── Ad Cost Breakdown ── */}
      <AdCostBreakdown
        adPlatforms={adPlatforms}
        onSync={handleAdSync}
        isSyncing={isAdSyncing}
        syncMessage={adSyncMessage}
      />

      {/* ── Brand Comparison Chart ── */}
      <BrandComparisonBar howpapa={howpapaStats} nucio={nucioStats} />

      {/* ── Empty State ── */}
      {!isLoading && !howpapaStats && !nucioStats && channels.length === 0 && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <h3 className="text-base font-semibold text-gray-600 mb-1.5">매출 데이터가 없습니다</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              판매 채널 API를 연동하거나 주문 데이터를 동기화하면 대시보드에 실시간 매출이 표시됩니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
