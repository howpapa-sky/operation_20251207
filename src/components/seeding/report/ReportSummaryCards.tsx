import { useEffect, useState, useRef } from 'react';
import { Send, CheckCircle2, Eye, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryData {
  totalSeedings: number;
  postingCount: number;
  postingRate: number;
  totalReach: number;
  totalEngagement: number;
  // 전월 대비 변화율
  seedingChange?: number;
  postingChange?: number;
  reachChange?: number;
  engagementChange?: number;
}

interface ReportSummaryCardsProps {
  data: SummaryData;
  isLoading?: boolean;
}

// 카운트업 애니메이션 훅
function useCountUp(end: number, duration: number = 1000, start: number = 0): number {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    countRef.current = start;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Easing function (easeOutQuart)
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (end - start) * eased);

      if (current !== countRef.current) {
        countRef.current = current;
        setCount(current);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, start]);

  return count;
}

// 숫자 포맷팅
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  suffix?: string;
  subLabel?: string;
  subValue?: string;
  change?: number;
  isLoading?: boolean;
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  suffix = '',
  subLabel,
  subValue,
  change,
  isLoading,
}: StatCardProps) {
  const animatedValue = useCountUp(isLoading ? 0 : value);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              change > 0
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {change > 0 ? '+' : ''}{change.toFixed(0)}%
          </div>
        )}
      </div>

      <div className="mb-1">
        <span className="text-3xl font-bold text-gray-900">
          {isLoading ? '-' : formatNumber(animatedValue)}
        </span>
        {suffix && (
          <span className="text-lg text-gray-500 ml-1">{suffix}</span>
        )}
      </div>
      <div className="text-sm text-gray-500">{label}</div>

      {subLabel && subValue && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
          <span className="text-gray-500">{subLabel}</span>
          <span className="font-medium text-gray-700">{subValue}</span>
        </div>
      )}
    </div>
  );
}

export default function ReportSummaryCards({ data, isLoading }: ReportSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Send className="w-6 h-6 text-blue-600" />}
        iconBg="bg-blue-100"
        label="총 시딩"
        value={data.totalSeedings}
        suffix="건"
        change={data.seedingChange}
        isLoading={isLoading}
      />

      <StatCard
        icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
        iconBg="bg-green-100"
        label="포스팅 완료"
        value={data.postingCount}
        suffix="건"
        subLabel="포스팅률"
        subValue={`${data.postingRate.toFixed(0)}%`}
        change={data.postingChange}
        isLoading={isLoading}
      />

      <StatCard
        icon={<Eye className="w-6 h-6 text-purple-600" />}
        iconBg="bg-purple-100"
        label="총 도달"
        value={data.totalReach}
        change={data.reachChange}
        isLoading={isLoading}
      />

      <StatCard
        icon={<MessageCircle className="w-6 h-6 text-pink-600" />}
        iconBg="bg-pink-100"
        label="총 참여"
        value={data.totalEngagement}
        subLabel="좋아요+댓글+저장"
        subValue=""
        change={data.engagementChange}
        isLoading={isLoading}
      />
    </div>
  );
}
