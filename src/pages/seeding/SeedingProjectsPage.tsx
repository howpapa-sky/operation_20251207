import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Plus, Search, Filter, X, BarChart3 } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { useProductMasterStore } from '../../store/useProductMasterStore';
import { SeedingProject, SeedingProjectStatus, Brand, seedingProjectStatusLabels } from '../../types';
import SeedingProjectCard from '../../components/seeding/SeedingProjectCard';
import SeedingProjectModal from '../../components/seeding/SeedingProjectModal';

export default function SeedingProjectsPage() {
  const {
    projects,
    isLoading,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    getProjectStats
  } = useSeedingStore();

  const { products } = useProductMasterStore();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<SeedingProjectStatus | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<Brand | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SeedingProject | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }
      // Brand filter
      if (brandFilter !== 'all' && project.brand !== brandFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          project.name.toLowerCase().includes(query) ||
          project.product_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [projects, statusFilter, brandFilter, searchQuery]);

  // Overall stats
  const overallStats = useMemo(() => {
    const stats = {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      planning: projects.filter((p) => p.status === 'planning').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    };
    return stats;
  }, [projects]);

  // Check if any filter is active
  const hasActiveFilters = statusFilter !== 'all' || brandFilter !== 'all' || searchQuery !== '';

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: SeedingProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleSaveProject = async (data: Omit<SeedingProject, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSaving(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
      } else {
        await addProject(data);
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleDuplicateProject = async (project: SeedingProject) => {
    const duplicateData = {
      name: `${project.name} (복사)`,
      brand: project.brand,
      product_id: project.product_id,
      product_name: project.product_name,
      start_date: project.start_date,
      end_date: project.end_date,
      target_count: project.target_count,
      cost_price: project.cost_price,
      selling_price: project.selling_price,
      status: 'planning' as SeedingProjectStatus,
      description: project.description,
      assignee_id: project.assignee_id,
    };

    try {
      await addProject(duplicateData);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setBrandFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시딩 프로젝트</h1>
            <p className="text-sm text-gray-500">제품별 인플루언서 시딩 캠페인 관리</p>
          </div>
        </div>
        <button
          onClick={handleCreateProject}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overallStats.total}</div>
              <div className="text-sm text-gray-500">전체 프로젝트</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{overallStats.active}</div>
              <div className="text-sm text-gray-500">진행중</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{overallStats.planning}</div>
              <div className="text-sm text-gray-500">기획중</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{overallStats.completed}</div>
              <div className="text-sm text-gray-500">완료</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프로젝트명, 제품명 검색..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggles */}
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
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {(statusFilter !== 'all' ? 1 : 0) + (brandFilter !== 'all' ? 1 : 0)}
                </span>
              )}
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
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SeedingProjectStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">전체</option>
                {Object.entries(seedingProjectStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">브랜드</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBrandFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setBrandFilter('howpapa')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'howpapa'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  하우파파
                </button>
                <button
                  onClick={() => setBrandFilter('nuccio')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'nuccio'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  누씨오
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-gray-500 mb-4">다른 검색 조건을 시도해보세요.</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 프로젝트가 없습니다</h3>
                <p className="text-gray-500 mb-4">첫 번째 시딩 프로젝트를 만들어보세요.</p>
                <button
                  onClick={handleCreateProject}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  프로젝트 만들기
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <SeedingProjectCard
              key={project.id}
              project={project}
              stats={getProjectStats(project.id)}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onDuplicate={handleDuplicateProject}
            />
          ))}
        </div>
      )}

      {/* Project Modal */}
      <SeedingProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        project={editingProject}
        isLoading={isSaving}
      />
    </div>
  );
}
