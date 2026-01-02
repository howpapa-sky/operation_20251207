import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  X,
  Download,
  Trash2,
  ChevronDown,
  Users,
} from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import {
  SeedingInfluencer,
  SeedingStatus,
  SeedingType,
  ContentType,
  ShippingInfo,
  SeedingPerformance,
  seedingTypeLabels,
  contentTypeLabels,
} from '../../types';
import SeedingListHeader from '../../components/seeding/SeedingListHeader';
import SeedingStatusTabs from '../../components/seeding/SeedingStatusTabs';
import SeedingTable from '../../components/seeding/SeedingTable';
import SeedingDetailPanel from '../../components/seeding/SeedingDetailPanel';
import SeedingAddModal from '../../components/seeding/SeedingAddModal';

export default function SeedingListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const {
    projects,
    influencers,
    isLoading,
    fetchProjects,
    fetchInfluencers,
    addInfluencer,
    addInfluencersBulk,
    updateInfluencer,
    updateInfluencerStatus,
    updateShipping,
    updatePerformance,
    deleteInfluencer,
    deleteInfluencersBulk,
    getProjectStats,
  } = useSeedingStore();

  // States
  const [statusFilter, setStatusFilter] = useState<SeedingStatus | 'all'>('all');
  const [seedingTypeFilter, setSeedingTypeFilter] = useState<SeedingType | 'all'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [selectedInfluencer, setSelectedInfluencer] = useState<SeedingInfluencer | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchProjects();
    if (projectId) {
      fetchInfluencers(projectId);
    }
  }, [projectId, fetchProjects, fetchInfluencers]);

  // Current project
  const currentProject = useMemo(() => {
    return projectId ? projects.find((p) => p.id === projectId) : null;
  }, [projectId, projects]);

  // Project stats
  const projectStats = useMemo(() => {
    if (!projectId) {
      return {
        project_id: '',
        total_influencers: 0,
        by_status: {
          listed: 0,
          contacted: 0,
          accepted: 0,
          rejected: 0,
          shipped: 0,
          guide_sent: 0,
          posted: 0,
          completed: 0,
        },
        by_type: { free: 0, paid: 0 },
        by_content: { story: 0, reels: 0, feed: 0, both: 0 },
        progress_rate: 0,
        total_cost: 0,
        total_fee: 0,
        total_reach: 0,
        total_engagement: 0,
      };
    }
    return getProjectStats(projectId);
  }, [projectId, getProjectStats, influencers]);

  // Filtered influencers
  const filteredInfluencers = useMemo(() => {
    return influencers.filter((inf) => {
      // Status filter
      if (statusFilter !== 'all' && inf.status !== statusFilter) {
        return false;
      }
      // Seeding type filter
      if (seedingTypeFilter !== 'all' && inf.seeding_type !== seedingTypeFilter) {
        return false;
      }
      // Content type filter
      if (contentTypeFilter !== 'all' && inf.content_type !== contentTypeFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          inf.account_id.toLowerCase().includes(query) ||
          inf.account_name?.toLowerCase().includes(query) ||
          inf.email?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [influencers, statusFilter, seedingTypeFilter, contentTypeFilter, searchQuery]);

  const hasActiveFilters = seedingTypeFilter !== 'all' || contentTypeFilter !== 'all' || searchQuery !== '';

  // Handlers
  const handleStatusChange = async (id: string, status: SeedingStatus) => {
    await updateInfluencerStatus(id, status);
    // Update selected influencer if panel is open
    if (selectedInfluencer?.id === id) {
      setSelectedInfluencer({ ...selectedInfluencer, status });
    }
  };

  const handleRowClick = (influencer: SeedingInfluencer) => {
    setSelectedInfluencer(influencer);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedInfluencer(null), 300);
  };

  const handleAddSingle = async (data: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>) => {
    await addInfluencer(data);
    if (projectId) {
      fetchInfluencers(projectId);
    }
  };

  const handleAddBulk = async (data: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>[]) => {
    await addInfluencersBulk(data);
    if (projectId) {
      fetchInfluencers(projectId);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteInfluencer(id);
    if (selectedInfluencer?.id === id) {
      handlePanelClose();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}명의 인플루언서를 삭제하시겠습니까?`)) return;
    await deleteInfluencersBulk(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  const handleBulkStatusChange = async (status: SeedingStatus) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await updateInfluencerStatus(id, status);
    }
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  const handleShippingUpdate = async (id: string, shipping: Partial<ShippingInfo>) => {
    await updateShipping(id, shipping);
    if (selectedInfluencer?.id === id) {
      setSelectedInfluencer({
        ...selectedInfluencer,
        shipping: { ...selectedInfluencer.shipping, ...shipping },
      });
    }
  };

  const handlePerformanceUpdate = async (id: string, performance: Partial<SeedingPerformance>) => {
    await updatePerformance(id, performance);
    if (selectedInfluencer?.id === id) {
      setSelectedInfluencer({
        ...selectedInfluencer,
        performance: { ...selectedInfluencer.performance, ...performance },
      });
    }
  };

  const handleInfluencerUpdate = async (id: string, updates: Partial<SeedingInfluencer>) => {
    await updateInfluencer(id, updates);
    if (selectedInfluencer?.id === id) {
      setSelectedInfluencer({ ...selectedInfluencer, ...updates });
    }
  };

  const clearFilters = () => {
    setSeedingTypeFilter('all');
    setContentTypeFilter('all');
    setSearchQuery('');
    setShowFilters(false);
  };

  const handleExportExcel = () => {
    // Create CSV content
    const headers = ['계정ID', '이름', '팔로워', '유형', '콘텐츠', '상태', '이메일', '연락처'];
    const rows = filteredInfluencers.map((inf) => [
      inf.account_id,
      inf.account_name || '',
      inf.follower_count,
      seedingTypeLabels[inf.seeding_type],
      contentTypeLabels[inf.content_type],
      inf.status,
      inf.email || '',
      inf.phone || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seeding_list_${currentProject?.name || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Redirect if no project
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 선택하세요</h2>
        <p className="text-gray-500 mb-6">시딩 리스트를 보려면 프로젝트를 먼저 선택해야 합니다.</p>
        <button
          onClick={() => navigate('/seeding/projects')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          프로젝트 목록으로
        </button>
      </div>
    );
  }

  if (!currentProject && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
        <p className="text-gray-500 mb-6">요청한 프로젝트가 존재하지 않거나 삭제되었습니다.</p>
        <button
          onClick={() => navigate('/seeding/projects')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          프로젝트 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project Header */}
      {currentProject && (
        <SeedingListHeader
          project={currentProject}
          stats={projectStats}
          onSync={() => {
            // TODO: Implement Google Sheets sync
            console.log('Sync clicked');
          }}
        />
      )}

      {/* Status Tabs */}
      <SeedingStatusTabs
        stats={projectStats}
        activeStatus={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Filter & Action Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="계정, 이름, 이메일 검색..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              필터
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                초기화
              </button>
            )}

            <div className="w-px h-6 bg-gray-200" />

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  일괄작업 ({selectedIds.size})
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showBulkActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowBulkActions(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        상태 변경
                      </div>
                      {(['contacted', 'accepted', 'shipped', 'posted', 'completed'] as SeedingStatus[]).map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => handleBulkStatusChange(status)}
                            className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                          >
                            {status === 'contacted' && '연락완료로 변경'}
                            {status === 'accepted' && '수락으로 변경'}
                            {status === 'shipped' && '제품발송으로 변경'}
                            {status === 'posted' && '포스팅완료로 변경'}
                            {status === 'completed' && '완료로 변경'}
                          </button>
                        )
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={handleBulkDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Export */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>

            {/* Add Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {/* Seeding Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">시딩 유형</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSeedingTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    seedingTypeFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSeedingTypeFilter('free')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    seedingTypeFilter === 'free'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  무가
                </button>
                <button
                  onClick={() => setSeedingTypeFilter('paid')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    seedingTypeFilter === 'paid'
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  유가
                </button>
              </div>
            </div>

            {/* Content Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">콘텐츠 유형</label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as ContentType | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">전체</option>
                {Object.entries(contentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <SeedingTable
        influencers={filteredInfluencers}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={handleRowClick}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* Result Count */}
      {!isLoading && (
        <div className="text-sm text-gray-500 text-center">
          {filteredInfluencers.length === influencers.length
            ? `총 ${influencers.length}명의 인플루언서`
            : `${filteredInfluencers.length}명 / 총 ${influencers.length}명`}
        </div>
      )}

      {/* Detail Panel */}
      <SeedingDetailPanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        influencer={selectedInfluencer}
        onStatusChange={handleStatusChange}
        onShippingUpdate={handleShippingUpdate}
        onPerformanceUpdate={handlePerformanceUpdate}
        onInfluencerUpdate={handleInfluencerUpdate}
      />

      {/* Add Modal */}
      {projectId && (
        <SeedingAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          projectId={projectId}
          onAddSingle={handleAddSingle}
          onAddBulk={handleAddBulk}
        />
      )}
    </div>
  );
}
