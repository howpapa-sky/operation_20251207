import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import Card from '../../common/Card';
import Badge from '../../common/Badge';
import { Project, ProjectStatus, ProjectType } from '../../../types';
import {
  formatDate,
  getDdayText,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  brandLabels,
} from '../../../utils/helpers';

interface BoardViewProps {
  projects: Project[];
  type: ProjectType;
  onDelete: (id: string) => void;
}

const statusOrder: ProjectStatus[] = ['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'];

export default function BoardView({ projects, type, onDelete }: BoardViewProps) {
  const navigate = useNavigate();

  const columns = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      label: statusLabels[status],
      projects: projects.filter((p) => p.status === status),
    }));
  }, [projects]);

  const renderProjectCard = (project: Project) => (
    <div
      key={project.id}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">{project.title}</h4>
        <div className="relative ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {'brand' in project && (
        <p className="text-xs text-gray-500 mb-2">{brandLabels[project.brand]}</p>
      )}

      <div className="flex items-center gap-1 mb-2">
        <Badge className={`${priorityColors[project.priority]} text-xs px-2 py-0.5`}>
          {priorityLabels[project.priority]}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(project.targetDate)}</span>
        <Badge
          variant={
            project.status === 'completed'
              ? 'success'
              : getDdayText(project.targetDate).startsWith('D+')
              ? 'danger'
              : 'info'
          }
          className="text-xs"
        >
          {project.status === 'completed' ? '완료' : getDdayText(project.targetDate)}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.status}
          className="flex-shrink-0 w-72"
        >
          <div className={`rounded-t-xl px-4 py-3 ${statusColors[column.status]}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <span className="text-sm opacity-75">{column.projects.length}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-b-xl p-3 min-h-[400px] space-y-3">
            {column.projects.map(renderProjectCard)}
            {column.projects.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                프로젝트 없음
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
