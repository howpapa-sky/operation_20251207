import { useState } from 'react';
import {
  MoreHorizontal,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  SeedingInfluencer,
  SeedingStatus,
} from '../../types';

interface SeedingTableRowProps {
  influencer: SeedingInfluencer;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: (influencer: SeedingInfluencer) => void;
  onStatusChange: (id: string, status: SeedingStatus) => void;
  onDelete: (id: string) => void;
}

export default function SeedingTableRow({
  influencer,
  isSelected,
  onSelect,
  onClick,
  onStatusChange,
  onDelete,
}: SeedingTableRowProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  };

  // 프로필 URL 생성
  const getProfileUrl = () => {
    if (influencer.profile_url) return influencer.profile_url;
    if (influencer.platform === 'instagram') {
      return `https://instagram.com/${influencer.account_id.replace('@', '')}`;
    }
    return null;
  };

  const profileUrl = getProfileUrl();

  // 상태에 따른 여부 계산
  const dmSent = ['contacted', 'accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(influencer.status);
  const responseReceived = ['accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(influencer.status);
  const isAccepted = ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'].includes(influencer.status);
  const isShipped = ['shipped', 'guide_sent', 'posted', 'completed'].includes(influencer.status);

  return (
    <tr
      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-primary-50' : ''
      }`}
      onClick={() => onClick(influencer)}
    >
      {/* Checkbox */}
      <td className="w-12 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(influencer.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>

      {/* 날짜 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700">
          {influencer.listed_at ? formatDate(influencer.listed_at) : '-'}
        </span>
      </td>

      {/* 계정 */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-900 truncate text-sm">
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
      </td>

      {/* 팔로워 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-900">
          {formatFollowers(influencer.follower_count)}
        </span>
      </td>

      {/* 팔로잉 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700">
          {influencer.following_count != null ? formatFollowers(influencer.following_count) : '-'}
        </span>
      </td>

      {/* 이메일 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700 truncate max-w-[150px] block">
          {influencer.email || '-'}
        </span>
      </td>

      {/* DM발송여부 */}
      <td className="px-3 py-3">
        {dmSent ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-300" />
        )}
      </td>

      {/* 응답여부 */}
      <td className="px-3 py-3">
        {responseReceived ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-300" />
        )}
      </td>

      {/* 수락일자 */}
      <td className="px-3 py-3">
        {influencer.status === 'rejected' ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : influencer.accepted_at ? (
          <span className="text-sm text-gray-700">{formatDate(influencer.accepted_at)}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>

      {/* 제품 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700 truncate max-w-[100px] block">
          {influencer.product_name || '-'}
        </span>
      </td>

      {/* 가격 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700">
          {influencer.product_price != null ? formatCurrency(influencer.product_price) : '-'}
        </span>
      </td>

      {/* 발송여부 */}
      <td className="px-3 py-3">
        {isShipped ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-300" />
        )}
      </td>

      {/* 발송일자 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700">
          {influencer.shipping?.shipped_at ? formatDate(influencer.shipping.shipped_at) : '-'}
        </span>
      </td>

      {/* 비고 */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-700 truncate max-w-[120px] block" title={influencer.notes}>
          {influencer.notes || '-'}
        </span>
      </td>

      {/* Actions */}
      <td className="w-12 px-3 py-3" onClick={(e) => e.stopPropagation()}>
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
