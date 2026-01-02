import { useState } from 'react';
import {
  MoreHorizontal,
  ExternalLink,
  Package,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  BookOpen,
  Image,
  Award,
  List,
} from 'lucide-react';
import {
  SeedingInfluencer,
  SeedingStatus,
  seedingStatusLabels,
  seedingTypeLabels,
  contentTypeLabels,
  seedingPlatformLabels,
} from '../../types';

interface SeedingTableRowProps {
  influencer: SeedingInfluencer;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: (influencer: SeedingInfluencer) => void;
  onStatusChange: (id: string, status: SeedingStatus) => void;
  onDelete: (id: string) => void;
}

// 상태별 설정
const statusConfig: Record<SeedingStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
  listed: { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: List },
  contacted: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send },
  accepted: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  shipped: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Package },
  guide_sent: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: BookOpen },
  posted: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: Image },
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Award },
};

export default function SeedingTableRow({
  influencer,
  isSelected,
  onSelect,
  onClick,
  onStatusChange,
  onDelete,
}: SeedingTableRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) return `₩${(value / 10000).toFixed(0)}만`;
    return `₩${value.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  };

  const formatViews = (views?: number) => {
    if (!views) return '-';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const StatusIcon = statusConfig[influencer.status].icon;

  // 배송 상태 표시
  const getShippingStatus = () => {
    if (!influencer.shipping) return null;
    if (influencer.shipping.delivered_at) {
      return { text: '배송완료', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (influencer.shipping.shipped_at) {
      return { text: '배송중', color: 'text-amber-600', bgColor: 'bg-amber-100' };
    }
    if (influencer.shipping.tracking_number) {
      return { text: '발송완료', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
    return { text: '대기', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  };

  const shippingStatus = getShippingStatus();

  // 프로필 URL 생성
  const getProfileUrl = () => {
    if (influencer.profile_url) return influencer.profile_url;
    if (influencer.platform === 'instagram') {
      return `https://instagram.com/${influencer.account_id.replace('@', '')}`;
    }
    return null;
  };

  const profileUrl = getProfileUrl();

  return (
    <tr
      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-primary-50' : ''
      }`}
      onClick={() => onClick(influencer)}
    >
      {/* Checkbox */}
      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(influencer.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
            {influencer.account_id.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-900 truncate">
                {influencer.account_id.startsWith('@') ? influencer.account_id : `@${influencer.account_id}`}
              </span>
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {influencer.account_name && (
              <div className="text-xs text-gray-500 truncate">{influencer.account_name}</div>
            )}
          </div>
        </div>
      </td>

      {/* Followers */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-900">
          {formatFollowers(influencer.follower_count)}
        </span>
      </td>

      {/* Seeding Type */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              influencer.seeding_type === 'free'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-violet-100 text-violet-700'
            }`}
          >
            {seedingTypeLabels[influencer.seeding_type]}
          </span>
          {influencer.seeding_type === 'paid' && influencer.fee && influencer.fee > 0 && (
            <span className="text-xs text-violet-600 font-medium">
              {formatCurrency(influencer.fee)}
            </span>
          )}
        </div>
      </td>

      {/* Content Type */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
          {contentTypeLabels[influencer.content_type]}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 ${
              statusConfig[influencer.status].bgColor
            } ${statusConfig[influencer.status].color}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {seedingStatusLabels[influencer.status]}
          </button>

          {/* Status Dropdown */}
          {showStatusMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowStatusMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20">
                {(Object.keys(statusConfig) as SeedingStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(influencer.id, status);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                        influencer.status === status ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className={config.color}>{seedingStatusLabels[status]}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </td>

      {/* Shipping */}
      <td className="px-4 py-3">
        {shippingStatus ? (
          <div className="flex items-center gap-1.5">
            <Package className={`w-3.5 h-3.5 ${shippingStatus.color}`} />
            <span className={`text-xs font-medium ${shippingStatus.color}`}>
              {shippingStatus.text}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>

      {/* Posting */}
      <td className="px-4 py-3">
        {influencer.posting_url ? (
          <div className="flex items-center gap-1.5">
            <a
              href={influencer.posting_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary-600 hover:text-primary-700"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            {influencer.posted_at && (
              <span className="text-xs text-gray-500">{formatDate(influencer.posted_at)}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>

      {/* Performance */}
      <td className="px-4 py-3">
        {influencer.performance?.views ? (
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">
              {formatViews(influencer.performance.views)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20">
                <button
                  onClick={() => {
                    onClick(influencer);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4" />
                  상세보기
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(influencer.account_id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  계정 복사
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (confirm('정말 삭제하시겠습니까?')) {
                      onDelete(influencer.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
