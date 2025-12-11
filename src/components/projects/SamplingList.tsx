import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  X,
  Star,
  LayoutDashboard,
  Beaker,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import SamplingDashboard from './SamplingDashboard';
import { useStore } from '../../store/useStore';
import {
  SamplingProject,
  ProjectStatus,
  Priority,
  Brand,
  ProductCategory,
  Manufacturer,
} from '../../types';
import {
  formatDate,
  getDdayText,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  brandLabels,
  exportToCSV,
} from '../../utils/helpers';

type ViewMode = 'list' | 'grid' | 'dashboard';

const categoryColors: Record<ProductCategory, string> = {
  '크림': '#6366f1',
  '패드': '#8b5cf6',
  '로션': '#a855f7',
  '스틱': '#d946ef',
  '앰플': '#ec4899',
  '세럼': '#f43f5e',
  '미스트': '#f97316',
  '클렌저': '#eab308',
  '선크림': '#22c55e',
  '마스크팩': '#14b8a6',
  '기타': '#64748b',
};

export default function SamplingList() {
  const navigate = useNavigate();
  const { projects, deleteProject } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority | ''>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | ''>('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | ''>('');
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // 샘플링 프로젝트만 필터링
  const samplingProjects = useMemo(() => {
    return projects.filter((p) => p.type === 'sampling') as SamplingProject[];
  }, [projects]);

  // 필터링된 프로젝트
  const filteredProjects = useMemo(() => {
    return samplingProjects
      .filter((p) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            p.title.toLowerCase().includes(query) ||
            p.notes.toLowerCase().includes(query) ||
            p.sampleCode?.toLowerCase().includes(query) ||
            p.manufacturer.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter((p) => (selectedStatus ? p.status === selectedStatus : true))
      .filter((p) => (selectedPriority ? p.priority === selectedPriority : true))
      .filter((p) => (selectedBrand ? p.brand === selectedBrand : true))
      .filter((p) => (selectedCategory ? p.category === selectedCategory : true))
      .filter((p) => (selectedManufacturer ? p.manufacturer === selectedManufacturer : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [samplingProjects, searchQuery, selectedStatus, selectedPriority, selectedBrand, selectedCategory, selectedManufacturer]);

  const handleDelete = (id: string) => {
    deleteProject(id);
    setDeleteModalId(null);
  };

  const handleExport = () => {
    const exportData = filteredProjects.map((p) => ({
      프로젝트명: p.title,
      브랜드: brandLabels[p.brand],
      카테고리: p.category,
      제조사: p.manufacturer,
      회차: `${p.round}차`,
      샘플코드: p.sampleCode || '-',
      평균평점: p.averageRating?.toFixed(2) || '-',
      상태: statusLabels[p.status],
      우선순위: priorityLabels[p.priority],
      시작일: formatDate(p.startDate),
      목표일: formatDate(p.targetDate),
      비고: p.notes,
    }));
    exportToCSV(exportData, `샘플링_${formatDate(new Date(), 'yyyyMMdd')}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedBrand('');
    setSelectedCategory('');
    setSelectedManufacturer('');
  };

  const hasFilters = searchQuery || selectedStatus || selectedPriority || selectedBrand || selectedCategory || selectedManufacturer;

  const categories: ProductCategory[] = ['크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'];
  const manufacturers: Manufacturer[] = ['콜마', '코스맥스', '기타'];

  const renderProjectCard = (project: SamplingProject) => {
    const isMenuOpen = actionMenuId === project.id;

    return (
      <Card key={project.id} hover className="p-5 relative">
        {/* Action Menu Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuId(isMenuOpen ? null : project.id);
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setActionMenuId(null)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-elegant-lg border border-gray-100 z-20 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sampling/${project.id}`);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  보기
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sampling/${project.id}/edit`);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuId(null);
                    setDeleteModalId(project.id);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </>
          )}
        </div>

        <div
          onClick={() => navigate(`/sampling/${project.id}`)}
          className="cursor-pointer"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{brandLabels[project.brand]}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">카테고리:</span>
              <span
                className="inline-flex items-center rounded-full font-medium px-3 py-1 text-xs"
                style={{ backgroundColor: `${categoryColors[project.category]}20`, color: categoryColors[project.category] }}
              >
                {project.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">제조사:</span>
              <span className="text-gray-700">{project.manufacturer}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">회차:</span>
              <span className="text-gray-700">{project.round}차</span>
            </div>
            {project.sampleCode && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">샘플코드:</span>
                <span className="text-gray-700 font-mono">{project.sampleCode}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
              {project.averageRating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{project.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <Badge
              variant={
                project.status === 'completed'
                  ? 'success'
                  : getDdayText(project.targetDate).startsWith('D+')
                  ? 'danger'
                  : 'warning'
              }
            >
              {project.status === 'completed' ? '완료' : getDdayText(project.targetDate)}
            </Badge>
          </div>
        </div>
      </Card>
    );
  };

  const renderProjectRow = (project: SamplingProject, index: number) => {
    const isMenuOpen = actionMenuId === project.id;
    const isLastRows = index >= filteredProjects.length - 2; // 마지막 2개 행

    return (
      <tr
        key={project.id}
        className="hover:bg-gray-50 cursor-pointer transition-all"
        onClick={() => navigate(`/sampling/${project.id}`)}
      >
        <td className="table-cell">
          <p className="font-medium text-gray-900">{project.title}</p>
        </td>
        <td className="table-cell text-gray-600">
          {brandLabels[project.brand]}
        </td>
        <td className="table-cell">
          <span
            className="inline-flex items-center rounded-full font-medium px-3 py-1 text-xs"
            style={{ backgroundColor: `${categoryColors[project.category]}20`, color: categoryColors[project.category] }}
          >
            {project.category}
          </span>
        </td>
        <td className="table-cell text-gray-600">
          {project.manufacturer}
        </td>
        <td className="table-cell text-gray-600">
          {project.round}차
        </td>
        <td className="table-cell text-gray-500 font-mono text-sm">
          {project.sampleCode || '-'}
        </td>
        <td className="table-cell">
          {project.averageRating ? (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{project.averageRating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="table-cell text-gray-600 text-sm">
          {formatDate(project.startDate)}
        </td>
        <td className="table-cell text-gray-600 text-sm">
          {formatDate(project.targetDate)}
        </td>
        <td className="table-cell">
          <Badge className={statusColors[project.status]}>
            {statusLabels[project.status]}
          </Badge>
        </td>
        <td className="table-cell">
          <Badge
            variant={
              project.status === 'completed'
                ? 'success'
                : getDdayText(project.targetDate).startsWith('D+')
                ? 'danger'
                : 'info'
            }
          >
            {project.status === 'completed' ? '완료' : getDdayText(project.targetDate)}
          </Badge>
        </td>
        <td className="table-cell">
          {project.notes ? (
            <span className="text-gray-600 text-sm truncate max-w-32 block" title={project.notes}>
              {project.notes.length > 20 ? `${project.notes.substring(0, 20)}...` : project.notes}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="table-cell overflow-visible">
          <div className="relative" style={{ overflow: 'visible' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuId(isMenuOpen ? null : project.id);
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuId(null);
                  }}
                />
                <div className={`absolute right-0 w-40 bg-white rounded-xl shadow-elegant-lg border border-gray-100 z-50 overflow-hidden ${isLastRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/sampling/${project.id}`);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    보기
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/sampling/${project.id}/edit`);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuId(null);
                      setDeleteModalId(project.id);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
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
  };

  const renderContent = () => {
    if (viewMode === 'dashboard') {
      return <SamplingDashboard projects={filteredProjects} />;
    }

    if (filteredProjects.length === 0) {
      return (
        <Card>
          <EmptyState
            title="샘플링 프로젝트가 없습니다"
            description="새 샘플링 프로젝트를 만들어 시작하세요"
            action={
              <button
                onClick={() => navigate('/sampling/new')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                새 샘플링 프로젝트 만들기
              </button>
            }
          />
        </Card>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(renderProjectCard)}
        </div>
      );
    }

    return (
      <Card padding="none" className="overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">제품명</th>
                <th className="table-header">브랜드</th>
                <th className="table-header">카테고리</th>
                <th className="table-header">제조사</th>
                <th className="table-header">회차</th>
                <th className="table-header">샘플코드</th>
                <th className="table-header">평점</th>
                <th className="table-header">시작일</th>
                <th className="table-header">목표일</th>
                <th className="table-header">상태</th>
                <th className="table-header">D-day</th>
                <th className="table-header">비고</th>
                <th className="table-header w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.map((project, index) => renderProjectRow(project, index))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
            <Beaker className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">샘플링</h1>
            <p className="text-gray-500">
              총 {filteredProjects.length}개의 샘플링 프로젝트
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button
            onClick={() => navigate('/sampling/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            새 샘플링
          </button>
        </div>
      </div>

      {/* Filters & View Options */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="제품명, 샘플코드, 제조사 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 border-primary-200' : ''}`}
          >
            <Filter className="w-4 h-4" />
            필터
            {hasFilters && (
              <span className="w-2 h-2 bg-primary-500 rounded-full" />
            )}
          </button>

          {/* View Mode Buttons */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              title="목록 보기"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 border-l border-gray-200 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              title="그리드 보기"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`p-2 border-l border-gray-200 ${viewMode === 'dashboard' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              title="대시보드"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | '')}
                className="select-field w-40"
              >
                <option value="">모든 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value as Brand | '')}
                className="select-field w-40"
              >
                <option value="">모든 브랜드</option>
                {Object.entries(brandLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value as Manufacturer | '')}
                className="select-field w-40"
              >
                <option value="">모든 제조사</option>
                {manufacturers.map((mfr) => (
                  <option key={mfr} value={mfr}>{mfr}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus | '')}
                className="select-field w-40"
              >
                <option value="">모든 상태</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as Priority | '')}
                className="select-field w-40"
              >
                <option value="">모든 우선순위</option>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Content based on view mode */}
      {renderContent()}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="샘플링 프로젝트 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 샘플링 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModalId(null)}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            onClick={() => handleDelete(deleteModalId!)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>
    </div>
  );
}
