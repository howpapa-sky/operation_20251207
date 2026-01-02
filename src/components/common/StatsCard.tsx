import { ReactNode, useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: number; // 양수: 증가, 음수: 감소
  trendLabel?: string;
  subtitle?: string;
  onClick?: () => void;
  animate?: boolean;
  formatValue?: (value: number) => string;
}

// 카운트업 애니메이션 훅
function useCountUp(end: number, duration: number = 800, animate: boolean = true): number {
  const [count, setCount] = useState(animate ? 0 : end);
  const countRef = useRef(animate ? 0 : end);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setCount(end);
      return;
    }

    countRef.current = 0;
    startTimeRef.current = null;

    const animateCount = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Easing function (easeOutQuart)
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * end);

      if (current !== countRef.current) {
        countRef.current = current;
        setCount(current);
      }

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animateCount);
  }, [end, duration, animate]);

  return count;
}

// 기본 숫자 포맷
function defaultFormatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}만`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export default function StatsCard({
  icon,
  iconBg = 'bg-gray-100',
  title,
  value,
  suffix,
  prefix,
  trend,
  trendLabel,
  subtitle,
  onClick,
  animate = true,
  formatValue = defaultFormatValue,
}: StatsCardProps) {
  const animatedValue = useCountUp(value, 800, animate);
  const isClickable = !!onClick;

  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:border-gray-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
        )}
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend > 0
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </div>
        )}
      </div>

      <div className="mb-1">
        {prefix && <span className="text-lg text-gray-500 mr-1">{prefix}</span>}
        <span className="text-3xl font-bold text-gray-900">
          {formatValue(animatedValue)}
        </span>
        {suffix && <span className="text-lg text-gray-500 ml-1">{suffix}</span>}
      </div>

      <div className="text-sm text-gray-500">{title}</div>

      {(subtitle || trendLabel) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
          {trendLabel && (
            <span className={`font-medium ${
              trend !== undefined && trend > 0 ? 'text-green-600' :
              trend !== undefined && trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trendLabel}
            </span>
          )}
          {subtitle && <span className="text-gray-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
