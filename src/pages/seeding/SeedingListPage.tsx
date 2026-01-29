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
import GoogleSheetsSync from '../../components/seeding/GoogleSheetsSync';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

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
      // Project filter - 현재 프로젝트의 인플루언서만 표시
      if (projectId && inf.project_id !== projectId) {
        return false;
      }
      // Status filter
      // "수락" 탭은 accepted 이후 상태(shipped, guide_sent, posted, completed)도 모두 포함
      if (statusFilter !== 'all') {
        if (statusFilter === 'accepted') {
          const acceptedStatuses: SeedingStatus[] = ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'];
          if (!acceptedStatuses.includes(inf.status)) {
            return false;
          }
        } else if (inf.status !== statusFilter) {
          return false;
        }
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
  }, [influencers, projectId, statusFilter, seedingTypeFilter, contentTypeFilter, searchQuery]);

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
    // 상태에 따른 DM발송/응답/수락/발송 여부 판별
    const getStatusFlags = (status: string) => {
      const dmSent = ['contacted', 'accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(status);
      const responseReceived = ['accepted', 'rejected', 'shipped', 'guide_sent', 'posted', 'completed'].includes(status);
      const acceptance = ['accepted', 'shipped', 'guide_sent', 'posted', 'completed'].includes(status);
      const shipped = ['shipped', 'guide_sent', 'posted', 'completed'].includes(status);
      return { dmSent, responseReceived, acceptance, shipped };
    };

    // 날짜 포맷팅
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
    };

    // Create CSV content with all fields
    const headers = [
      '날짜', '계정', '팔로워', '팔로잉', '이메일',
      'DM발송', '응답', '수락일자', '제품', '가격',
      '발송', '업로드 예정', '비고'
    ];

    const rows = filteredInfluencers.map((inf) => {
      const flags = getStatusFlags(inf.status);
      return [
        formatDate(inf.listed_at),
        inf.account_id,
        inf.follower_count,
        inf.following_count || 0,
        inf.email || '',
        flags.dmSent ? 'O' : '',
        flags.responseReceived ? 'O' : '',
        inf.accepted_at ? formatDate(inf.accepted_at) : '',
        inf.product_name || '',
        inf.product_price || '',
        flags.shipped ? 'O' : '',
        formatDate(inf.shipping?.shipped_at),
        inf.notes || '',
      ];
    });

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
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 선택하세요</h2>
          <p className="text-gray-500 mb-6">시딩 리스트를 보려면 프로젝트를 먼저 선택해야 합니다.</p>
          <Button onClick={() => navigate('/seeding/projects')}>
            프로젝트 목록으로
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentProject && !isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-6">요청한 프로젝트가 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => navigate('/seeding/projects')}>
            프로젝트 목록으로
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project Header */}
      {currentProject && (
        <SeedingListHeader
          project={currentProject}
          stats={projectStats}
          onSync={() => setIsSyncModalOpen(true)}
        />
      )}

      {/* Status Tabs */}
      <SeedingStatusTabs
        stats={projectStats}
        activeStatus={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Filter & Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="계정, 이름, 이메일 검색..."
                className="pl-9"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                필터
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-gray-500"
                >
                  <X className="w-4 h-4" />
                  초기화
                </Button>
              )}

              <div className="w-px h-6 bg-gray-200" />

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="gap-2"
                  >
                    일괄작업 ({selectedIds.size})
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {showBulkActions && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowBulkActions(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border py-1 z-20">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                내보내기
              </Button>

              {/* Add Button */}
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                추가
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              {/* Seeding Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">시딩 유형</label>
                <div className="flex gap-2">
                  <Button
                    variant={seedingTypeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeedingTypeFilter('all')}
                  >
                    전체
                  </Button>
                  <Button
                    variant={seedingTypeFilter === 'free' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeedingTypeFilter('free')}
                    className={cn(
                      seedingTypeFilter === 'free' && 'bg-emerald-500 hover:bg-emerald-600'
                    )}
                  >
                    무가
                  </Button>
                  <Button
                    variant={seedingTypeFilter === 'paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeedingTypeFilter('paid')}
                    className={cn(
                      seedingTypeFilter === 'paid' && 'bg-violet-500 hover:bg-violet-600'
                    )}
                  >
                    유가
                  </Button>
                </div>
              </div>

              {/* Content Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">콘텐츠 유형</label>
                <Select
                  value={contentTypeFilter}
                  onValueChange={(value) => setContentTypeFilter(value as ContentType | 'all')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="콘텐츠 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.entries(contentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
          {filteredInfluencers.length === influencers.filter(inf => inf.project_id === projectId).length
            ? `총 ${filteredInfluencers.length}명의 인플루언서`
            : `${filteredInfluencers.length}명 / 총 ${influencers.filter(inf => inf.project_id === projectId).length}명`}
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

      {/* Google Sheets Sync Modal */}
      {currentProject && (
        <GoogleSheetsSync
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          project={currentProject}
          onSyncComplete={() => {
            if (projectId) {
              fetchInfluencers(projectId);
            }
          }}
        />
      )}
    </div>
  );
}
