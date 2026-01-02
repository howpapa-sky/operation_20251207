import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Users } from 'lucide-react';
import { SeedingInfluencer, SeedingStatus } from '../../types';
import SeedingTableRow from './SeedingTableRow';

interface SeedingTableProps {
  influencers: SeedingInfluencer[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (influencer: SeedingInfluencer) => void;
  onStatusChange: (id: string, status: SeedingStatus) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

type SortField = 'account_id' | 'follower_count' | 'status' | 'posted_at' | 'performance';
type SortDirection = 'asc' | 'desc';

// 스켈레톤 로딩 컴포넌트
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="w-12 px-4 py-3">
        <div className="w-4 h-4 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full" />
          <div className="space-y-1.5">
            <div className="w-24 h-4 bg-gray-200 rounded" />
            <div className="w-16 h-3 bg-gray-200 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="w-12 h-4 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-10 h-5 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-12 h-5 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="w-14 h-4 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-10 h-4 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="w-10 h-4 bg-gray-200 rounded" />
      </td>
      <td className="w-12 px-4 py-3">
        <div className="w-6 h-6 bg-gray-200 rounded" />
      </td>
    </tr>
  );
}

export default function SeedingTable({
  influencers,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onStatusChange,
  onDelete,
  isLoading = false,
}: SeedingTableProps) {
  const [sortField, setSortField] = useState<SortField>('account_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 정렬된 인플루언서 목록
  const sortedInfluencers = useMemo(() => {
    return [...influencers].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'account_id':
          comparison = a.account_id.localeCompare(b.account_id);
          break;
        case 'follower_count':
          comparison = a.follower_count - b.follower_count;
          break;
        case 'status': {
          const statusOrder: Record<SeedingStatus, number> = {
            listed: 0,
            contacted: 1,
            accepted: 2,
            rejected: 3,
            shipped: 4,
            guide_sent: 5,
            posted: 6,
            completed: 7,
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        }
        case 'posted_at':
          if (!a.posted_at && !b.posted_at) comparison = 0;
          else if (!a.posted_at) comparison = 1;
          else if (!b.posted_at) comparison = -1;
          else comparison = new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime();
          break;
        case 'performance':
          comparison = (a.performance?.views || 0) - (b.performance?.views || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [influencers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(influencers.map((i) => i.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedIds);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange(newSelection);
  };

  const isAllSelected = influencers.length > 0 && selectedIds.size === influencers.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < influencers.length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (!isLoading && influencers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">인플루언서가 없습니다</h3>
        <p className="text-gray-500">인플루언서를 추가하여 시딩을 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {/* Checkbox */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>

              {/* Account */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('account_id')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  계정
                  <SortIcon field="account_id" />
                </button>
              </th>

              {/* Followers */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('follower_count')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  팔로워
                  <SortIcon field="follower_count" />
                </button>
              </th>

              {/* Type */}
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  유형
                </span>
              </th>

              {/* Content */}
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  콘텐츠
                </span>
              </th>

              {/* Status */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  상태
                  <SortIcon field="status" />
                </button>
              </th>

              {/* Shipping */}
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  배송
                </span>
              </th>

              {/* Posting */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('posted_at')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  포스팅
                  <SortIcon field="posted_at" />
                </button>
              </th>

              {/* Performance */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('performance')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  성과
                  <SortIcon field="performance" />
                </button>
              </th>

              {/* Actions */}
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              sortedInfluencers.map((influencer) => (
                <SeedingTableRow
                  key={influencer.id}
                  influencer={influencer}
                  isSelected={selectedIds.has(influencer.id)}
                  onSelect={handleSelectOne}
                  onClick={onRowClick}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
