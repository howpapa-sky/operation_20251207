import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, eachWeekOfInterval, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User, AlertCircle, CheckCircle } from 'lucide-react';
import Badge from '../../common/Badge';
import { Project, ProjectType } from '../../../types';
import { statusLabels, statusColors, priorityColors, priorityLabels, brandLabels } from '../../../utils/helpers';

interface WorkloadViewProps {
  projects: Project[];
  type: ProjectType;
}

interface AssigneeWorkload {
  assignee: string;
  projects: Project[];
  totalProjects: number;
  completedProjects: number;
  overdueProjects: number;
  workloadLevel: 'low' | 'medium' | 'high' | 'overload';
}

export default function WorkloadView({ projects, type }: WorkloadViewProps) {
  const navigate = useNavigate();

  const assigneeWorkloads = useMemo(() => {
    const workloadMap: Record<string, Project[]> = {};

    projects.forEach((project) => {
      const assignee = project.assignee || '미배정';
      if (!workloadMap[assignee]) {
        workloadMap[assignee] = [];
      }
      workloadMap[assignee].push(project);
    });

    const workloads: AssigneeWorkload[] = Object.entries(workloadMap).map(([assignee, assigneeProjects]) => {
      const activeProjects = assigneeProjects.filter(
        (p) => p.status !== 'completed' && p.status !== 'cancelled'
      );
      const completedProjects = assigneeProjects.filter((p) => p.status === 'completed').length;
      const overdueProjects = activeProjects.filter(
        (p) => new Date(p.targetDate) < new Date()
      ).length;

      let workloadLevel: 'low' | 'medium' | 'high' | 'overload' = 'low';
      if (activeProjects.length >= 10) workloadLevel = 'overload';
      else if (activeProjects.length >= 7) workloadLevel = 'high';
      else if (activeProjects.length >= 4) workloadLevel = 'medium';

      return {
        assignee,
        projects: assigneeProjects,
        totalProjects: assigneeProjects.length,
        completedProjects,
        overdueProjects,
        workloadLevel,
      };
    });

    return workloads.sort((a, b) => {
      if (a.assignee === '미배정') return 1;
      if (b.assignee === '미배정') return -1;
      return b.projects.length - a.projects.length;
    });
  }, [projects]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = eachWeekOfInterval(
      {
        start: startOfWeek(now, { locale: ko }),
        end: endOfWeek(addWeeks(now, 3), { locale: ko }),
      },
      { locale: ko }
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { locale: ko });
      const weekProjects = projects.filter((p) => {
        if (p.status === 'completed' || p.status === 'cancelled') return false;
        const targetDate = parseISO(p.targetDate);
        return isWithinInterval(targetDate, { start: weekStart, end: weekEnd });
      });

      return {
        weekStart,
        weekEnd,
        label: format(weekStart, 'M/d', { locale: ko }) + ' - ' + format(weekEnd, 'M/d', { locale: ko }),
        projects: weekProjects,
        count: weekProjects.length,
      };
    });
  }, [projects]);

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'overload':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getWorkloadLabel = (level: string) => {
    switch (level) {
      case 'low':
        return '여유';
      case 'medium':
        return '보통';
      case 'high':
        return '바쁨';
      case 'overload':
        return '과부하';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">주간 마감 현황</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {weeklyData.map((week, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${
                index === 0 ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{week.label}</span>
                {index === 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                    이번 주
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{week.count}</div>
              <p className="text-sm text-gray-500">마감 예정</p>
              {week.count > 0 && (
                <div className="mt-3 space-y-1">
                  {week.projects.slice(0, 3).map((project) => (
                    <div
                      key={project.id}
                      className="text-xs text-gray-600 truncate cursor-pointer hover:text-gray-900"
                      onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
                    >
                      {project.title}
                    </div>
                  ))}
                  {week.projects.length > 3 && (
                    <div className="text-xs text-gray-400">+{week.projects.length - 3}개 더</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assignee Workload */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">담당자별 업무량</h3>
        </div>

        {assigneeWorkloads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">담당자가 배정된 프로젝트가 없습니다</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assigneeWorkloads.map((workload) => (
              <div key={workload.assignee} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{workload.assignee}</h4>
                      <p className="text-sm text-gray-500">
                        진행 중: {workload.totalProjects - workload.completedProjects}개
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {workload.overdueProjects > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">지연 {workload.overdueProjects}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">완료 {workload.completedProjects}</span>
                    </div>
                    <Badge className={getWorkloadColor(workload.workloadLevel)}>
                      {getWorkloadLabel(workload.workloadLevel)}
                    </Badge>
                  </div>
                </div>

                {/* Workload Bar */}
                <div className="mb-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        workload.workloadLevel === 'overload'
                          ? 'bg-red-500'
                          : workload.workloadLevel === 'high'
                          ? 'bg-orange-500'
                          : workload.workloadLevel === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          ((workload.totalProjects - workload.completedProjects) / 10) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Project List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {workload.projects
                    .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
                    .slice(0, 6)
                    .map((project) => (
                      <div
                        key={project.id}
                        className="p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
                        onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">
                            {project.title}
                          </p>
                          <Badge className={`${statusColors[project.status]} text-xs ml-2`}>
                            {statusLabels[project.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {workload.projects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
                    .length > 6 && (
                    <div className="p-2 text-center text-sm text-gray-500">
                      +
                      {workload.projects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
                        .length - 6}
                      개 더
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
