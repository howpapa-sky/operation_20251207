import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Circle, Clock, PauseCircle, XCircle } from 'lucide-react';
import Badge from '../../common/Badge';
import { Project, ProjectStatus, ProjectType } from '../../../types';
import { statusLabels, statusColors, priorityLabels, priorityColors, brandLabels } from '../../../utils/helpers';

interface WorkflowViewProps {
  projects: Project[];
  type: ProjectType;
}

const workflowSteps: { status: ProjectStatus; icon: React.ElementType }[] = [
  { status: 'planning', icon: Circle },
  { status: 'in_progress', icon: Clock },
  { status: 'review', icon: Clock },
  { status: 'completed', icon: CheckCircle },
];

const stepColors: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  planning: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
  review: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300' },
  completed: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300' },
  on_hold: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300' },
};

export default function WorkflowView({ projects, type }: WorkflowViewProps) {
  const navigate = useNavigate();

  const getCurrentStepIndex = (status: ProjectStatus): number => {
    return workflowSteps.findIndex((step) => step.status === status);
  };

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatus, Project[]> = {
      planning: [],
      in_progress: [],
      review: [],
      completed: [],
      on_hold: [],
      cancelled: [],
    };

    projects.forEach((project) => {
      grouped[project.status].push(project);
    });

    return grouped;
  }, [projects]);

  return (
    <div className="space-y-8">
      {/* Workflow Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">워크플로 현황</h3>
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const colors = stepColors[step.status];
            const count = projectsByStatus[step.status].length;

            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex-1 text-center">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${colors.bg} ${colors.border} border-2 mb-2`}
                  >
                    <Icon className={`w-8 h-8 ${colors.text}`} />
                  </div>
                  <p className="font-medium text-gray-900">{statusLabels[step.status]}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-gray-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* On Hold & Cancelled */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-8 justify-center">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-600">보류:</span>
              <span className="font-bold text-yellow-600">{projectsByStatus.on_hold.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-gray-600">취소:</span>
              <span className="font-bold text-red-600">{projectsByStatus.cancelled.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project List by Workflow Step */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflowSteps.map((step) => {
          const colors = stepColors[step.status];
          const Icon = step.icon;
          const stepProjects = projectsByStatus[step.status];

          return (
            <div key={step.status} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-4 py-3 ${colors.bg} border-b border-gray-200 flex items-center gap-2`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
                <h4 className="font-semibold text-gray-900">{statusLabels[step.status]}</h4>
                <Badge className={`ml-auto ${colors.bg} ${colors.text}`}>{stepProjects.length}</Badge>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {stepProjects.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">프로젝트 없음</p>
                ) : (
                  <div className="space-y-2">
                    {stepProjects.map((project) => (
                      <div
                        key={project.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{project.title}</p>
                            {'brand' in project && (
                              <p className="text-sm text-gray-500">{brandLabels[project.brand]}</p>
                            )}
                          </div>
                          <Badge className={priorityColors[project.priority]}>
                            {priorityLabels[project.priority]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
