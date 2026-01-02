import { SeedingInfluencer, SeedingProject } from '../../types';
import ShippingTableRow from './ShippingTableRow';

interface ShippingTableProps {
  influencers: SeedingInfluencer[];
  projects: SeedingProject[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onUpdateShipping: (id: string, carrier: string, trackingNumber: string) => Promise<void>;
  onCopyAddress: (influencer: SeedingInfluencer) => void;
  isLoading?: boolean;
}

export default function ShippingTable({
  influencers,
  projects,
  selectedIds,
  onSelectAll,
  onSelect,
  onUpdateShipping,
  onCopyAddress,
  isLoading = false,
}: ShippingTableProps) {
  const allSelected = influencers.length > 0 && selectedIds.size === influencers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < influencers.length;

  const getProject = (projectId: string) => {
    return projects.find((p) => p.id === projectId);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-20" />
              ))}
            </div>
          </div>
          {/* Row skeletons */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
                <div className="w-32 h-8 bg-gray-200 rounded" />
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-12 h-4 bg-gray-200 rounded" />
                <div className="w-48 h-8 bg-gray-200 rounded" />
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                인플루언서
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                수령인
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                주소
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                수량
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[260px]">
                택배사 / 송장번호
              </th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {influencers.map((influencer) => (
              <ShippingTableRow
                key={influencer.id}
                influencer={influencer}
                project={getProject(influencer.project_id)}
                isSelected={selectedIds.has(influencer.id)}
                onSelect={onSelect}
                onUpdateShipping={onUpdateShipping}
                onCopyAddress={onCopyAddress}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state is handled by parent */}
    </div>
  );
}
