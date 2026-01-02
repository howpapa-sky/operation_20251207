import { ArrowLeft, Calendar, Target, DollarSign, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SeedingProject, SeedingProjectStats } from '../../types';

interface SeedingListHeaderProps {
  project: SeedingProject;
  stats: SeedingProjectStats;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSyncAt?: string;
}

export default function SeedingListHeader({
  project,
  stats,
  onSync,
  isSyncing = false,
  lastSyncAt,
}: SeedingListHeaderProps) {
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  // 완료된 수 (posted + completed)
  const completedCount = stats.by_status.posted + stats.by_status.completed;

  // 총 비용 (제품 원가 * 수량 + 원고비)
  const totalCost = stats.total_cost + stats.total_fee;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Top Row */}
      <div className="flex items-start justify-between mb-4">
        {/* Back & Title */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/seeding/projects')}
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  project.brand === 'howpapa'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {project.brand === 'howpapa' ? '하우파파' : '누씨오'}
              </span>
            </div>
            {project.product_name && (
              <p className="text-sm text-gray-500">{project.product_name}</p>
            )}
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          {lastSyncAt && (
            <span className="text-xs text-gray-400">
              마지막 동기화: {formatRelativeTime(lastSyncAt)}
            </span>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '동기화 중...' : 'Google Sheets 동기화'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm">
        {/* Date Range */}
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>
            {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
          </span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Progress */}
        <div className="flex items-center gap-2 text-gray-600">
          <Target className="w-4 h-4 text-gray-400" />
          <span>
            <span className="font-semibold text-gray-900">{completedCount}</span>
            <span className="text-gray-400"> / </span>
            <span>{project.target_count}명</span>
          </span>
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden ml-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.brand === 'howpapa'
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                  : 'bg-gradient-to-r from-green-400 to-green-500'
              }`}
              style={{ width: `${Math.min((completedCount / project.target_count) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Total Cost */}
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span>
            총 비용: <span className="font-semibold text-gray-900">{formatCurrency(totalCost)}</span>
          </span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Total Reach */}
        {stats.total_reach > 0 && (
          <div className="flex items-center gap-2 text-gray-600">
            <ExternalLink className="w-4 h-4 text-gray-400" />
            <span>
              총 도달: <span className="font-semibold text-gray-900">
                {stats.total_reach >= 1000000
                  ? `${(stats.total_reach / 1000000).toFixed(1)}M`
                  : stats.total_reach >= 1000
                  ? `${(stats.total_reach / 1000).toFixed(1)}K`
                  : stats.total_reach.toLocaleString()}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
