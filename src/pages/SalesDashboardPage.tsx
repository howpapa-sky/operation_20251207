import { useEffect, useState } from 'react';
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
  Target,
  BarChart3,
  RefreshCw,
  Calendar,
  Store,
  Megaphone,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { useSalesDashboardStore } from '@/store/salesDashboardStore';
import {
  SalesChannel,
  salesChannelLabels,
  adChannelLabels,
  AdChannel,
} from '@/types/ecommerce';
import { cn } from '@/lib/utils';

// 숫자 포맷팅
function formatCurrency(value: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(value)));
  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

function formatPercent(value: number, showSign = false): string {
  const formatted = Math.abs(value).toFixed(1);
  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
}

// KPI 카드 컴포넌트
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
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
                <span className={cn(
                  change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                )}>
                  {formatPercent(change, true)}
                </span>
                <span className="text-gray-400">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-full', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 채널별 성과 카드
function ChannelPerformanceCard({
  channel,
  revenue,
  orders,
  profit,
  profitRate,
}: {
  channel: SalesChannel | 'all';
  revenue: number;
  orders: number;
  profit: number;
  profitRate: number;
}) {
  const channelName = channel === 'all' ? '전체' : salesChannelLabels[channel] || channel;

  const channelColors: Record<string, string> = {
    smartstore: 'border-l-green-500',
    coupang: 'border-l-orange-500',
    coupang_rocket: 'border-l-orange-400',
    cafe24: 'border-l-blue-500',
    qoo10: 'border-l-purple-500',
    all: 'border-l-gray-500',
  };

  return (
    <Card className={cn('border-l-4', channelColors[channel] || 'border-l-gray-500')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{channelName}</h4>
          <Badge variant={profit >= 0 ? 'default' : 'destructive'}>
            {formatPercent(profitRate)} 마진
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">매출</p>
            <p className="font-semibold">{formatCurrency(revenue)}원</p>
          </div>
          <div>
            <p className="text-gray-500">주문</p>
            <p className="font-semibold">{orders}건</p>
          </div>
          <div>
            <p className="text-gray-500">순이익</p>
            <p className={cn('font-semibold', profit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(profit, true)}원
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 광고 성과 카드
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
  const channelName = channel ? (adChannelLabels[channel as AdChannel] || channel) : '전체 광고';

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
            <p className="font-semibold">{clicks} / {formatPercent(ctr)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalesDashboardPage() {
  const {
    dashboardStats,
    channelStats,
    adStats,
    isLoading,
    error,
    selectedDateRange,
    selectedChannel,
    selectedBrand,
    setDateRange,
    setSelectedChannel,
    setSelectedBrand,
    fetchDashboardStats,
    calculateSummary,
  } = useSalesDashboardStore();

  const [startDate, setStartDate] = useState(selectedDateRange.start);
  const [endDate, setEndDate] = useState(selectedDateRange.end);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleDateRangeApply = () => {
    setDateRange({ start: startDate, end: endDate });
  };

  const handleQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const newRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };

    setStartDate(newRange.start);
    setEndDate(newRange.end);
    setDateRange(newRange);
  };

  // 채널별 집계
  const channelSummaries = (() => {
    const summary: Record<string, {
      revenue: number;
      orders: number;
      cost: number;
      shipping: number;
      fee: number;
    }> = {};

    channelStats.forEach(stat => {
      if (selectedBrand !== 'all' && stat.brand !== selectedBrand) return;

      const ch = stat.channel;
      if (!summary[ch]) {
        summary[ch] = { revenue: 0, orders: 0, cost: 0, shipping: 0, fee: 0 };
      }
      summary[ch].revenue += stat.totalRevenue;
      summary[ch].orders += stat.totalOrders;
      summary[ch].cost += stat.totalCost;
      summary[ch].shipping += stat.totalShipping;
      summary[ch].fee += stat.totalFee;
    });

    return Object.entries(summary).map(([channel, data]) => ({
      channel: channel as SalesChannel,
      revenue: data.revenue,
      orders: data.orders,
      profit: data.revenue - data.cost - data.shipping - data.fee,
      profitRate: data.revenue > 0
        ? ((data.revenue - data.cost - data.shipping - data.fee) / data.revenue) * 100
        : 0,
    }));
  })();

  // 광고 채널별 집계
  const adSummaries = (() => {
    const summary: Record<string, {
      cost: number;
      conversions: number;
      conversionValue: number;
      clicks: number;
      impressions: number;
    }> = {};

    adStats.forEach(stat => {
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

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-orange-500" />
            매출 대시보드
          </h1>
          <p className="text-gray-500 mt-1">채널별 매출 현황 및 수익성 분석</p>
        </div>
        <Button
          onClick={() => fetchDashboardStats()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          새로고침
        </Button>
      </div>

      {/* 필터 영역 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 날짜 범위 */}
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
              <Button variant="outline" size="sm" onClick={handleDateRangeApply}>
                적용
              </Button>
            </div>

            {/* 빠른 날짜 선택 */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(1)}>오늘</Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(7)}>7일</Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(30)}>30일</Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickDate(90)}>90일</Button>
            </div>

            <div className="flex-1" />

            {/* 브랜드 필터 */}
            <Select
              value={selectedBrand}
              onValueChange={(v) => setSelectedBrand(v as 'howpapa' | 'nuccio' | 'all')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 브랜드</SelectItem>
                <SelectItem value="howpapa">하우파파</SelectItem>
                <SelectItem value="nuccio">누치오</SelectItem>
              </SelectContent>
            </Select>

            {/* 채널 필터 */}
            <Select
              value={selectedChannel}
              onValueChange={(v) => setSelectedChannel(v as SalesChannel | 'all')}
            >
              <SelectTrigger className="w-40">
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
        </CardContent>
      </Card>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* KPI 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 매출"
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
          value={summary.contributionProfit}
          unit="원"
          icon={summary.contributionProfit >= 0 ? TrendingUp : TrendingDown}
          color={summary.contributionProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* ROAS & 마진 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">ROAS</span>
            </div>
            <p className="text-3xl font-bold text-purple-700">
              {formatPercent(summary.roas)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              광고수익률 (전환매출 / 광고비)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">공헌이익률</span>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {summary.totalRevenue > 0
                ? formatPercent((summary.contributionProfit / summary.totalRevenue) * 100)
                : '0%'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              (공헌이익 / 매출) × 100
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">평균 객단가</span>
            </div>
            <p className="text-3xl font-bold text-orange-700">
              {formatCurrency(summary.avgOrderValue)}원
            </p>
            <p className="text-sm text-gray-500 mt-1">
              총 매출 / 주문 수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 채널별 성과 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-600" />
          채널별 매출 현황
        </h2>
        {channelSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelSummaries.map((ch) => (
              <ChannelPerformanceCard
                key={ch.channel}
                channel={ch.channel}
                revenue={ch.revenue}
                orders={ch.orders}
                profit={ch.profit}
                profitRate={ch.profitRate}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>선택한 기간에 매출 데이터가 없습니다.</p>
              <p className="text-sm mt-1">채널 API 연동 후 데이터가 표시됩니다.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 광고 성과 */}
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
              <p className="text-sm mt-1">광고 채널 API 연동 후 데이터가 표시됩니다.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 데이터 없음 안내 (전체가 비어있을 때) */}
      {!isLoading && channelSummaries.length === 0 && adSummaries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              아직 매출 데이터가 없습니다
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              판매 채널 API를 연동하거나, 수동으로 주문 데이터를 등록하면
              이 대시보드에서 실시간 매출과 수익성을 확인할 수 있습니다.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                스마트스토어 API 연동 예정
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                쿠팡 API 연동 예정
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
