import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { ProfitBreakdown } from '@/types/ecommerce';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '' : ''}${value.toFixed(1)}%`;
}

interface ProfitBreakdownCardProps {
  title: string;
  profitValue: number;
  profitRate: number;
  formula: string;
  details: { label: string; value: number; isNegative?: boolean }[];
  color: 'blue' | 'green' | 'orange';
  settingsPath?: string;
  breakdown: ProfitBreakdown;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
    headerBg: 'bg-gradient-to-r from-green-500 to-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    headerBg: 'bg-gradient-to-r from-orange-500 to-orange-600',
  },
};

export default function ProfitBreakdownCard({
  title,
  profitValue,
  profitRate,
  formula,
  details,
  color,
  settingsPath,
}: ProfitBreakdownCardProps) {
  const navigate = useNavigate();
  const colors = colorMap[color];

  return (
    <Card className={cn('overflow-hidden border', colors.border)}>
      {/* Header */}
      <div className={cn('px-5 py-4 text-white', colors.headerBg)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold">
                {formatCurrency(profitValue)}원
              </span>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-0 text-xs"
              >
                {profitValue >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {formatPercent(profitRate)}
              </Badge>
            </div>
          </div>
          {settingsPath && (
            <button
              onClick={() => navigate(settingsPath)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <CardContent className="p-5">
        {/* Formula */}
        <p className="text-xs text-gray-400 mb-4 font-mono">{formula}</p>

        {/* Detail Items */}
        <div className="space-y-2.5">
          {details.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  item.isNegative ? 'text-red-500' : 'text-gray-900'
                )}
              >
                {item.isNegative ? '-' : ''}
                {formatCurrency(Math.abs(item.value))}원
              </span>
            </div>
          ))}
        </div>

        {/* Divider + Result */}
        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <span className={cn('text-sm font-semibold', colors.text)}>
              {title}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-bold', colors.text)}>
                {formatCurrency(profitValue)}원
              </span>
              {settingsPath && (
                <button
                  onClick={() => navigate(settingsPath)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
