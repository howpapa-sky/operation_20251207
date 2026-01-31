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

type SortField = 'listed_at' | 'account_id' | 'follower_count' | 'following_count' | 'email' | 'dm_sent' | 'response' | 'accepted' | 'shipped' | 'product_name' | 'product_price' | 'posted_at' | 'completed_at' | 'notes';
type SortDirection = 'asc' | 'desc';

// 상태에 따른 boolean 플래그
const getDmSent = (status: string) => ['contacted', 'accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(status);
const getResponseReceived = (status: string) => ['accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(status);
const getIsAccepted = (inf: SeedingInfluencer) => !!inf.accepted_at || ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'].includes(inf.status);
const getIsShipped = (status: string) => ['shipped', 'guide_sent', 'posted', 'completed'].includes(status);

// 스켈레톤 로딩 컴포넌트
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="w-12 px-3 py-3"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-12 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-12 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-32 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-14 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-4 bg-gray-200 rounded" /></td>
      <td className="px-3 py-3"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="w-12 px-3 py-3"><div className="w-6 h-6 bg-gray-200 rounded" /></td>
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
        case 'listed_at':
          if (!a.listed_at && !b.listed_at) comparison = 0;
          else if (!a.listed_at) comparison = 1;
          else if (!b.listed_at) comparison = -1;
          else comparison = new Date(a.listed_at).getTime() - new Date(b.listed_at).getTime();
          break;
        case 'account_id':
          comparison = a.account_id.localeCompare(b.account_id);
          break;
        case 'follower_count':
          comparison = a.follower_count - b.follower_count;
          break;
        case 'following_count':
          comparison = (a.following_count || 0) - (b.following_count || 0);
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'dm_sent':
          comparison = Number(getDmSent(a.status)) - Number(getDmSent(b.status));
          break;
        case 'response':
          comparison = Number(getResponseReceived(a.status)) - Number(getResponseReceived(b.status));
          break;
        case 'accepted':
          comparison = Number(getIsAccepted(a)) - Number(getIsAccepted(b));
          break;
        case 'shipped':
          comparison = Number(getIsShipped(a.status)) - Number(getIsShipped(b.status));
          break;
        case 'product_name':
          comparison = (a.product_name || '').localeCompare(b.product_name || '');
          break;
        case 'product_price':
          comparison = (a.product_price || 0) - (b.product_price || 0);
          break;
        case 'posted_at':
          const aPosted = a.posted_at;
          const bPosted = b.posted_at;
          if (!aPosted && !bPosted) comparison = 0;
          else if (!aPosted) comparison = 1;
          else if (!bPosted) comparison = -1;
          else comparison = new Date(aPosted).getTime() - new Date(bPosted).getTime();
          break;
        case 'completed_at':
          const aCompleted = a.completed_at;
          const bCompleted = b.completed_at;
          if (!aCompleted && !bCompleted) comparison = 0;
          else if (!aCompleted) comparison = 1;
          else if (!bCompleted) comparison = -1;
          else comparison = new Date(aCompleted).getTime() - new Date(bCompleted).getTime();
          break;
        case 'notes':
          comparison = (a.notes || '').localeCompare(b.notes || '');
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
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {/* Checkbox */}
              <th className="w-12 px-3 py-3">
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

              {/* 날짜 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('listed_at')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  날짜
                  <SortIcon field="listed_at" />
                </button>
              </th>

              {/* 계정 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('account_id')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  계정
                  <SortIcon field="account_id" />
                </button>
              </th>

              {/* 팔로워 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('follower_count')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  팔로워
                  <SortIcon field="follower_count" />
                </button>
              </th>

              {/* 팔로잉 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('following_count')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  팔로잉
                  <SortIcon field="following_count" />
                </button>
              </th>

              {/* 이메일 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  이메일
                  <SortIcon field="email" />
                </button>
              </th>

              {/* DM발송여부 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('dm_sent')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  DM발송
                  <SortIcon field="dm_sent" />
                </button>
              </th>

              {/* 응답여부 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('response')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  응답
                  <SortIcon field="response" />
                </button>
              </th>

              {/* 수락여부 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('accepted')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  수락
                  <SortIcon field="accepted" />
                </button>
              </th>

              {/* 수락일자 */}
              <th className="px-3 py-3 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  수락일자
                </span>
              </th>

              {/* 제품 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('product_name')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  제품
                  <SortIcon field="product_name" />
                </button>
              </th>

              {/* 가격 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('product_price')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  가격
                  <SortIcon field="product_price" />
                </button>
              </th>

              {/* 발송여부 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('shipped')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  발송
                  <SortIcon field="shipped" />
                </button>
              </th>

              {/* 업로드 예정 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('posted_at')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  업로드 예정
                  <SortIcon field="posted_at" />
                </button>
              </th>

              {/* 완료일 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('completed_at')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  완료일
                  <SortIcon field="completed_at" />
                </button>
              </th>

              {/* 비고 */}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort('notes')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  비고
                  <SortIcon field="notes" />
                </button>
              </th>

              {/* Actions */}
              <th className="w-12 px-3 py-3"></th>
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
