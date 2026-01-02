import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Target,
  Users,
  Eye,
  DollarSign,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { SeedingProject, SeedingProjectStats, seedingProjectStatusLabels } from '../../types';

interface SeedingProjectCardProps {
  project: SeedingProject;
  stats: SeedingProjectStats;
  onEdit: (project: SeedingProject) => void;
  onDelete: (id: string) => void;
  onDuplicate: (project: SeedingProject) => void;
}

export default function SeedingProjectCard({
  project,
  stats,
  onEdit,
  onDelete,
  onDuplicate,
}: SeedingProjectCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    return value.toLocaleString();
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  // 진행률 계산 (posted + completed 상태 기준)
  const completedCount = stats.by_status.posted + stats.by_status.completed;
  const progressRate = project.target_count > 0
    ? Math.min((completedCount / project.target_count) * 100, 100)
    : 0;

  // 상태 배지 색상
  const getStatusBadgeClass = () => {
    switch (project.status) {
      case 'planning':
        return 'bg-gray-100 text-gray-700';
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleCardClick = () => {
    navigate(`/seeding/list/${project.id}`);
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Brand Color Bar */}
      <div
        className={`h-1.5 ${
          project.brand === 'howpapa'
            ? 'bg-gradient-to-r from-orange-400 to-orange-500'
            : 'bg-gradient-to-r from-green-400 to-green-500'
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  project.brand === 'howpapa'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {project.brand === 'howpapa' ? '하우파파' : '누씨오'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass()}`}>
                {seedingProjectStatusLabels[project.status]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {project.name}
            </h3>
            {project.product_name && (
              <p className="text-sm text-gray-500 truncate">{project.product_name}</p>
            )}
          </div>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(project);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    복제
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('정말 삭제하시겠습니까?')) {
                        onDelete(project.id);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Date & Target */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            <span>{project.target_count}명 목표</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-500">진행률</span>
            <span className="font-medium text-gray-900">
              {completedCount}/{project.target_count} 완료
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.brand === 'howpapa'
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                  : 'bg-gradient-to-r from-green-400 to-green-500'
              }`}
              style={{ width: `${progressRate}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">{stats.total_influencers}</div>
            <div className="text-xs text-gray-500">인플루언서</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">
              ₩{formatCurrency(stats.total_cost + stats.total_fee)}
            </div>
            <div className="text-xs text-gray-500">총 비용</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {stats.total_reach > 0 ? formatNumber(stats.total_reach) : '-'}
            </div>
            <div className="text-xs text-gray-500">총 도달</div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/seeding/list/${project.id}`);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          리스트 보기
        </button>
      </div>
    </div>
  );
}
