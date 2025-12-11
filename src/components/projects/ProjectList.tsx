import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  X,
  Kanban,
  GanttChart,
  Clock,
  GitBranch,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { useStore } from '../../store/useStore';
import {
  BoardView,
  GanttView,
  CalendarView,
  TimelineView,
  WorkflowView,
  DashboardView,
  WorkloadView,
} from './views';
import {
  Project,
  ProjectType,
  ProjectStatus,
  Priority,
  Brand,
} from '../../types';
import {
  formatDate,
  getDdayText,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  brandLabels,
  projectTypeLabels,
  exportToCSV,
} from '../../utils/helpers';

type ViewMode = 'list' | 'grid' | 'board' | 'gantt' | 'calendar' | 'timeline' | 'workflow' | 'dashboard' | 'workload';

interface ViewOption {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
}

const viewOptions: ViewOption[] = [
  { id: 'list', label: '목록', icon: List },
  { id: 'grid', label: '그리드', icon: Grid3X3 },
  { id: 'board', label: '보드', icon: Kanban },
  { id: 'gantt', label: '간트', icon: GanttChart },
  { id: 'calendar', label: '캘린더', icon: Calendar },
  { id: 'timeline', label: '타임라인', icon: Clock },
  { id: 'workflow', label: '워크플로', icon: GitBranch },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'workload', label: '워크로드', icon: Users },
];

interface ProjectListProps {
  type: ProjectType;
  title: string;
  icon: React.ReactNode;
}

export default function ProjectList({ type, title, icon }: ProjectListProps) {
  const navigate = useNavigate();
  const { projects, deleteProject, filters, setFilters } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority | ''>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | ''>('');
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // 필터링된 프로젝트
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => p.type === type)
      .filter((p) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            p.title.toLowerCase().includes(query) ||
            p.notes.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter((p) => (selectedStatus ? p.status === selectedStatus : true))
      .filter((p) => (selectedPriority ? p.priority === selectedPriority : true))
      .filter((p) => {
        if (selectedBrand && 'brand' in p) {
          return p.brand === selectedBrand;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects, type, searchQuery, selectedStatus, selectedPriority, selectedBrand]);

  const handleDelete = (id: string) => {
    deleteProject(id);
    setDeleteModalId(null);
  };

  const handleExport = () => {
    const exportData = filteredProjects.map((p) => ({
      프로젝트명: p.title,
      상태: statusLabels[p.status],
      우선순위: priorityLabels[p.priority],
      시작일: formatDate(p.startDate),
      목표일: formatDate(p.targetDate),
      완료일: p.completedDate ? formatDate(p.completedDate) : '-',
      비고: p.notes,
    }));
    exportToCSV(exportData, `${title}_${formatDate(new Date(), 'yyyyMMdd')}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedBrand('');
  };

  const hasFilters = searchQuery || selectedStatus || selectedPriority || selectedBrand;

  const currentViewOption = viewOptions.find((v) => v.id === viewMode);
  const CurrentViewIcon = currentViewOption?.icon || List;

  const renderProjectCard = (project: Project) => {
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
                    navigate(`/${type.replace('_', '-')}/${project.id}`);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  보기
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${type.replace('_', '-')}/${project.id}/edit`);
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

        <div onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
              {'brand' in project && (
                <p className="text-sm text-gray-500 mt-1">{brandLabels[project.brand]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>
            <Badge className={priorityColors[project.priority]}>
              {priorityLabels[project.priority]}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {formatDate(project.startDate)} ~ {formatDate(project.targetDate)}
            </span>
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

  const renderProjectRow = (project: Project, index: number) => {
    const isMenuOpen = actionMenuId === project.id;
    const isLastRows = index >= filteredProjects.length - 2; // 마지막 2개 행

    return (
      <tr
        key={project.id}
        className="hover:bg-gray-50 cursor-pointer transition-all"
        onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
      >
        <td className="table-cell">
          <div>
            <p className="font-medium text-gray-900">{project.title}</p>
            {'brand' in project && (
              <p className="text-sm text-gray-500">{brandLabels[project.brand]}</p>
            )}
          </div>
        </td>
        <td className="table-cell">
          <Badge className={statusColors[project.status]}>
            {statusLabels[project.status]}
          </Badge>
        </td>
        <td className="table-cell">
          <Badge className={priorityColors[project.priority]}>
            {priorityLabels[project.priority]}
          </Badge>
        </td>
        <td className="table-cell text-gray-500">
          {formatDate(project.startDate)}
        </td>
        <td className="table-cell text-gray-500">
          {formatDate(project.targetDate)}
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
            <span className="text-gray-600 text-sm whitespace-pre-wrap">
              {project.notes}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="table-cell">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) {
                  setActionMenuId(null);
                  setMenuPosition(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPosition({
                    top: rect.top - 8,
                    left: rect.right - 160,
                  });
                  setActionMenuId(project.id);
                }
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && menuPosition && (
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuId(null);
                    setMenuPosition(null);
                  }}
                />
                <div
                  className="fixed w-40 bg-white rounded-xl shadow-elegant-lg border border-gray-100 z-[9999] overflow-hidden"
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    transform: 'translateY(-100%)'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${type.replace('_', '-')}/${project.id}`);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    보기
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${type.replace('_', '-')}/${project.id}/edit`);
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
                      setMenuPosition(null);
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
    if (filteredProjects.length === 0) {
      return (
        <Card>
          <EmptyState
            title="프로젝트가 없습니다"
            description="새 프로젝트를 만들어 시작하세요"
            action={
              <button
                onClick={() => navigate(`/${type.replace('_', '-')}/new`)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                새 프로젝트 만들기
              </button>
            }
          />
        </Card>
      );
    }

    switch (viewMode) {
      case 'board':
        return <BoardView projects={filteredProjects} type={type} onDelete={(id) => setDeleteModalId(id)} />;
      case 'gantt':
        return <GanttView projects={filteredProjects} type={type} />;
      case 'calendar':
        return <CalendarView projects={filteredProjects} type={type} />;
      case 'timeline':
        return <TimelineView projects={filteredProjects} type={type} />;
      case 'workflow':
        return <WorkflowView projects={filteredProjects} type={type} />;
      case 'dashboard':
        return <DashboardView projects={filteredProjects} type={type} />;
      case 'workload':
        return <WorkloadView projects={filteredProjects} type={type} />;
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(renderProjectCard)}
          </div>
        );
      case 'list':
      default:
        return (
          <Card padding="none" overflow="visible">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">프로젝트명</th>
                    <th className="table-header">상태</th>
                    <th className="table-header">우선순위</th>
                    <th className="table-header">시작일</th>
                    <th className="table-header">목표일</th>
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-500">
              총 {filteredProjects.length}개의 프로젝트
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button
            onClick={() => navigate(`/${type.replace('_', '-')}/new`)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            새 프로젝트
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
              placeholder="프로젝트 검색..."
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

          {/* View Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowViewOptions(!showViewOptions)}
              className="btn-secondary flex items-center gap-2"
            >
              <CurrentViewIcon className="w-4 h-4" />
              {currentViewOption?.label}
            </button>

            {showViewOptions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowViewOptions(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-elegant-lg border border-gray-100 z-20 overflow-hidden">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setViewMode(option.id);
                          setShowViewOptions(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          viewMode === option.id
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
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

              {['sampling', 'detail_page', 'product_order', 'group_purchase'].includes(type) && (
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
              )}

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
        title="프로젝트 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
