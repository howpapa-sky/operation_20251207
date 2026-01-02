import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Truck,
  Search,
  Download,
  Upload,
  Check,
  Filter,
  X,
  Copy,
  CheckCircle2,
  Clock,
  PackageOpen,
} from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { SeedingInfluencer, SeedingStatus } from '../../types';
import ShippingTable from '../../components/seeding/ShippingTable';
import BulkTrackingModal from '../../components/seeding/BulkTrackingModal';
import { carriers } from '../../components/seeding/ShippingTableRow';

type ShippingTab = 'pending' | 'shipping' | 'delivered';

const shippingTabs: { value: ShippingTab; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: '발송대기', icon: <PackageOpen className="w-4 h-4" /> },
  { value: 'shipping', label: '배송중', icon: <Truck className="w-4 h-4" /> },
  { value: 'delivered', label: '배송완료', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export default function ShippingPage() {
  const {
    projects,
    influencers,
    isLoading,
    fetchProjects,
    fetchInfluencers,
    updateShipping,
  } = useSeedingStore();

  // Filter states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<ShippingTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchProjects();
    fetchInfluencers();
  }, [fetchProjects, fetchInfluencers]);

  // 배송 관련 상태의 인플루언서만 필터링 (accepted, shipped, guide_sent, posted, completed)
  const shippingEligibleInfluencers = useMemo(() => {
    const eligibleStatuses: SeedingStatus[] = ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'];
    return influencers.filter((inf) => eligibleStatuses.includes(inf.status));
  }, [influencers]);

  // Filtered by project
  const projectFilteredInfluencers = useMemo(() => {
    if (selectedProjectId === 'all') return shippingEligibleInfluencers;
    return shippingEligibleInfluencers.filter((inf) => inf.project_id === selectedProjectId);
  }, [shippingEligibleInfluencers, selectedProjectId]);

  // Categorize by shipping status
  const categorizedInfluencers = useMemo(() => {
    const pending: SeedingInfluencer[] = [];
    const shipping: SeedingInfluencer[] = [];
    const delivered: SeedingInfluencer[] = [];

    projectFilteredInfluencers.forEach((inf) => {
      if (inf.shipping?.delivered_at) {
        delivered.push(inf);
      } else if (inf.status === 'shipped' || inf.shipping?.tracking_number) {
        shipping.push(inf);
      } else {
        pending.push(inf);
      }
    });

    return { pending, shipping, delivered };
  }, [projectFilteredInfluencers]);

  // Get current tab influencers
  const tabInfluencers = useMemo(() => {
    let list = categorizedInfluencers[activeTab];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (inf) =>
          inf.account_id.toLowerCase().includes(query) ||
          inf.account_name?.toLowerCase().includes(query) ||
          inf.shipping?.recipient_name?.toLowerCase().includes(query) ||
          inf.shipping?.tracking_number?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [categorizedInfluencers, activeTab, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const pending = categorizedInfluencers.pending.length;
    const shipping = categorizedInfluencers.shipping.length;
    const delivered = categorizedInfluencers.delivered.length;
    const totalQuantity = projectFilteredInfluencers.reduce(
      (sum, inf) => sum + (inf.shipping?.quantity || 1),
      0
    );

    return { pending, shipping, delivered, totalQuantity };
  }, [categorizedInfluencers, projectFilteredInfluencers]);

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(tabInfluencers.map((inf) => inf.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleUpdateShipping = async (
    id: string,
    carrier: string,
    trackingNumber: string
  ) => {
    await updateShipping(id, {
      carrier,
      tracking_number: trackingNumber,
    });
    showToastMessage('송장번호가 등록되었습니다.');
  };

  const handleBulkUpdate = async (
    updates: { id: string; carrier: string; trackingNumber: string }[]
  ) => {
    for (const update of updates) {
      await updateShipping(update.id, {
        carrier: update.carrier,
        tracking_number: update.trackingNumber,
      });
    }
    setSelectedIds(new Set());
    showToastMessage(`${updates.length}건의 송장번호가 등록되었습니다.`);
  };

  const handleCopyAddress = async (influencer: SeedingInfluencer) => {
    const shipping = influencer.shipping;
    if (!shipping) return;

    const addressText = [
      shipping.recipient_name,
      shipping.phone,
      shipping.postal_code,
      shipping.address,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(addressText);
      showToastMessage('주소가 복사되었습니다.');
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleExportCSV = () => {
    const data = tabInfluencers.map((inf) => ({
      '계정': `@${inf.account_id.replace('@', '')}`,
      '이름': inf.account_name || '',
      '수령인': inf.shipping?.recipient_name || '',
      '연락처': inf.shipping?.phone || '',
      '우편번호': inf.shipping?.postal_code || '',
      '주소': inf.shipping?.address || '',
      '수량': inf.shipping?.quantity || 1,
      '택배사': carriers.find((c) => c.value === inf.shipping?.carrier)?.label || '',
      '송장번호': inf.shipping?.tracking_number || '',
      '상태': activeTab === 'delivered' ? '배송완료' : activeTab === 'shipping' ? '배송중' : '발송대기',
    }));

    // Create CSV
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `배송목록_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToastMessage('CSV 파일이 다운로드되었습니다.');
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const selectedInfluencers = tabInfluencers.filter((inf) => selectedIds.has(inf.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">배송 관리</h1>
            <p className="text-sm text-gray-500">제품 발송 및 송장 관리</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              일괄 송장등록 ({selectedIds.size})
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={tabInfluencers.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-500">발송 대기</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats.shipping}</div>
              <div className="text-sm text-gray-500">배송 중</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-gray-500">배송 완료</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalQuantity}</div>
              <div className="text-sm text-gray-500">총 발송 수량</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedIds(new Set());
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[200px]"
            >
              <option value="all">전체 프로젝트</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.brand === 'howpapa' ? '하우파파' : '누씨오'})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="계정, 수령인, 송장번호 검색..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1" />

          {/* Tab Count */}
          <span className="text-sm text-gray-500">
            총 <span className="font-medium text-gray-900">{tabInfluencers.length}</span>건
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {shippingTabs.map((tab) => {
            const count = categorizedInfluencers[tab.value].length;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setSelectedIds(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? tab.value === 'pending'
                      ? 'bg-gray-900 text-white'
                      : tab.value === 'shipping'
                      ? 'bg-amber-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      ) : tabInfluencers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            {activeTab === 'pending' ? (
              <PackageOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            ) : activeTab === 'shipping' ? (
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'pending'
                ? '발송 대기 중인 항목이 없습니다'
                : activeTab === 'shipping'
                ? '배송 중인 항목이 없습니다'
                : '배송 완료된 항목이 없습니다'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'pending'
                ? '수락된 인플루언서가 있으면 여기에 표시됩니다.'
                : activeTab === 'shipping'
                ? '송장번호를 등록하면 여기에 표시됩니다.'
                : '배송이 완료되면 여기에 표시됩니다.'}
            </p>
          </div>
        </div>
      ) : (
        <ShippingTable
          influencers={tabInfluencers}
          projects={projects}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelect={handleSelect}
          onUpdateShipping={handleUpdateShipping}
          onCopyAddress={handleCopyAddress}
          isLoading={isLoading}
        />
      )}

      {/* Bulk Tracking Modal */}
      <BulkTrackingModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedInfluencers={selectedInfluencers}
        onBulkUpdate={handleBulkUpdate}
      />

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-xl">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
