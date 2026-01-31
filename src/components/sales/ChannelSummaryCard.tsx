import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelSummaryWithComparison } from '@/types/ecommerce';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function ChangeIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-0.5">
        <Minus className="w-3 h-3" /> -
      </span>
    );
  }
  const isPositive = value > 0;
  return (
    <span
      className={cn(
        'text-xs flex items-center gap-0.5',
        isPositive ? 'text-green-600' : 'text-red-500'
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const channelColors: Record<string, string> = {
  smartstore: 'border-t-green-500',
  coupang: 'border-t-orange-500',
  coupang_rocket: 'border-t-orange-400',
  cafe24: 'border-t-blue-500',
  qoo10: 'border-t-purple-500',
};

interface ChannelSummaryCardProps {
  data: ChannelSummaryWithComparison;
}

export default function ChannelSummaryCard({ data }: ChannelSummaryCardProps) {
  const borderColor = channelColors[data.channel] || 'border-t-gray-500';

  const metrics = [
    {
      label: '결제금액',
      value: `${formatCurrency(data.current.revenue)}원`,
      change: data.changes.revenue,
    },
    {
      label: '주문수',
      value: `${formatNumber(data.current.orders)}건`,
      change: data.changes.orders,
    },
    {
      label: '객단가',
      value: `${formatCurrency(data.current.avgOrderValue)}원`,
      change: data.changes.avgOrderValue,
    },
    {
      label: '수수료',
      value: `${formatCurrency(data.current.channelFee)}원`,
      change: data.changes.channelFee,
    },
    {
      label: '매출총이익',
      value: `${formatCurrency(data.current.grossProfit)}원`,
      change: data.changes.grossProfit,
      highlight: true,
    },
  ];

  return (
    <Card className={cn('border-t-4 hover:shadow-md transition-shadow', borderColor)}>
      <CardContent className="p-4">
        {/* Channel Name + Profit Rate */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">{data.channelName}</h4>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              data.current.grossProfitRate >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            이익률 {data.current.grossProfitRate.toFixed(1)}%
          </span>
        </div>

        {/* Metrics */}
        <div className="space-y-2.5">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={cn(
                'flex items-center justify-between',
                metric.highlight && 'pt-2 border-t border-gray-100'
              )}
            >
              <span className="text-sm text-gray-500">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    metric.highlight ? 'text-green-700 font-semibold' : 'text-gray-900'
                  )}
                >
                  {metric.value}
                </span>
                <ChangeIndicator value={metric.change} />
              </div>
            </div>
          ))}
        </div>

        {/* Previous Period Label */}
        <div className="mt-3 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">
            이전 기간 대비 변화율
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
