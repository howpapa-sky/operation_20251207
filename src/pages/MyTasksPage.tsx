import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { usePersonalTaskStore } from '../store/usePersonalTaskStore';
import { useStore } from '../store/useStore';
import {
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  formatDate,
  getDdayText,
  projectTypeLabels,
} from '../utils/helpers';

export default function MyTasksPage() {
  const navigate = useNavigate();
  const { projects } = useStore();
  const { myTasks, tasksLoading, fetchMyTasks, updateTaskStatus } = usePersonalTaskStore();

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Get my projects from the main store
  const myProjects = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'cancelled'
  );

  const inProgressProjects = myProjects.filter((p) => p.status === 'in_progress');
  const pendingProjects = myProjects.filter((p) => p.status === 'planning' || p.status === 'review');
  const overdueProjects = myProjects.filter(
    (p) => new Date(p.targetDate) < new Date() && p.status !== 'completed'
  );

  const getBasePath = (type: string) => `/${type.replace('_', '-')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
          <CheckSquare className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 작업 현황</h1>
          <p className="text-gray-500">나에게 배정된 프로젝트 현황</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">진행 중</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressProjects.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">대기 중</p>
              <p className="text-2xl font-bold text-gray-600">{pendingProjects.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">지연</p>
              <p className="text-2xl font-bold text-red-600">{overdueProjects.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">전체</p>
              <p className="text-2xl font-bold text-gray-900">{myProjects.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overdue Projects */}
      {overdueProjects.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            지연된 프로젝트
          </h3>
          <div className="space-y-3">
            {overdueProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer transition-colors"
                onClick={() => navigate(`${getBasePath(project.type)}/${project.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {projectTypeLabels[project.type]}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                  <p className="text-sm text-gray-500">
                    목표일: {formatDate(project.targetDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="danger">{getDdayText(project.targetDate)}</Badge>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* In Progress Projects */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          진행 중인 프로젝트
        </h3>
        {inProgressProjects.length === 0 ? (
          <p className="text-center text-gray-500 py-8">진행 중인 프로젝트가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {inProgressProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 cursor-pointer transition-colors"
                onClick={() => navigate(`${getBasePath(project.type)}/${project.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={priorityColors[project.priority]}>
                      {priorityLabels[project.priority]}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {projectTypeLabels[project.type]}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                  <p className="text-sm text-gray-500">
                    {formatDate(project.startDate)} ~ {formatDate(project.targetDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      getDdayText(project.targetDate).startsWith('D+') ? 'danger' : 'info'
                    }
                  >
                    {getDdayText(project.targetDate)}
                  </Badge>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending Projects */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gray-500" />
          대기 중인 프로젝트
        </h3>
        {pendingProjects.length === 0 ? (
          <p className="text-center text-gray-500 py-8">대기 중인 프로젝트가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {pendingProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => navigate(`${getBasePath(project.type)}/${project.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                    <Badge className={priorityColors[project.priority]}>
                      {priorityLabels[project.priority]}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {projectTypeLabels[project.type]}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {formatDate(project.targetDate)}
                  </span>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
