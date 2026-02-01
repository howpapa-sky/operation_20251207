import {
  List,
  Send,
  CheckCircle,
  XCircle,
  Package,
  Award,
} from 'lucide-react';
import { SeedingStatus, SeedingProjectStats, seedingStatusLabels } from '../../types';

interface SeedingStatusTabsProps {
  stats: SeedingProjectStats;
  activeStatus: SeedingStatus | 'all';
  onChange: (status: SeedingStatus | 'all') => void;
  completedAtCount?: number;
}

// 상태별 설정
const statusConfig: Record<SeedingStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
  listed: { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: List },
  contacted: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send },
  accepted: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  shipped: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Package },
  guide_sent: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: List },
  posted: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: List },
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Award },
};

// 표시할 상태 순서 (rejected는 별도 처리, guide_sent/posted 탭 제거)
const displayStatuses: SeedingStatus[] = [
  'listed',
  'contacted',
  'accepted',
  'shipped',
  'completed',
];

export default function SeedingStatusTabs({
  stats,
  activeStatus,
  onChange,
  completedAtCount,
}: SeedingStatusTabsProps) {
  const totalCount = stats.total_influencers;
  const rejectedCount = stats.by_status.rejected;

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center overflow-x-auto">
        {/* All Tab */}
        <button
          onClick={() => onChange('all')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeStatus === 'all'
              ? 'border-primary-500 text-primary-600 bg-primary-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          전체
          <span
            className={`min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              activeStatus === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* Status Tabs */}
        {displayStatuses.map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          // 누적 카운트: 각 탭은 해당 상태 이후 모든 상태를 포함
          // 연락완료 = DM발송 수 (contacted + accepted + rejected + shipped + guide_sent + posted + completed)
          // 수락 = 응답 수 (accepted + shipped + guide_sent + posted + completed)
          // 제품발송 = 발송 수 (shipped + guide_sent + posted + completed)
          // 완료 = 완료 수 (completed)
          let count: number;
          if (status === 'contacted') {
            count = stats.by_status.contacted + stats.by_status.accepted + stats.by_status.rejected + stats.by_status.shipped + stats.by_status.guide_sent + stats.by_status.posted + stats.by_status.completed;
          } else if (status === 'accepted') {
            count = stats.by_status.accepted + stats.by_status.shipped + stats.by_status.guide_sent + stats.by_status.posted + stats.by_status.completed;
          } else if (status === 'shipped') {
            count = stats.by_status.shipped + stats.by_status.guide_sent + stats.by_status.posted + stats.by_status.completed;
          } else if (status === 'completed') {
            // 완료 = 완료일(completed_at) 필드가 있는 인플루언서 수
            count = completedAtCount ?? stats.by_status.completed;
          } else {
            count = stats.by_status[status];
          }
          const isActive = activeStatus === status;

          return (
            <button
              key={status}
              onClick={() => onChange(status)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? `border-current ${config.color} bg-opacity-10`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={isActive ? { backgroundColor: `${config.bgColor.replace('bg-', '')}20` } : undefined}
            >
              <Icon className={`w-4 h-4 ${isActive ? config.color : 'text-gray-400'}`} />
              <span>{seedingStatusLabels[status]}</span>
              <span
                className={`min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? config.bgColor + ' ' + config.color : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Rejected Tab (separate) */}
        {rejectedCount > 0 && (
          <>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={() => onChange('rejected')}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeStatus === 'rejected'
                  ? 'border-red-500 text-red-600 bg-red-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <XCircle className={`w-4 h-4 ${activeStatus === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} />
              <span>거절</span>
              <span
                className={`min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  activeStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {rejectedCount}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
