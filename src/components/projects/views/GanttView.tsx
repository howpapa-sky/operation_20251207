import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameMonth, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import Badge from '../../common/Badge';
import { Project, ProjectType } from '../../../types';
import { statusColors, statusLabels, priorityColors, brandLabels } from '../../../utils/helpers';

interface GanttViewProps {
  projects: Project[];
  type: ProjectType;
}

export default function GanttView({ projects, type }: GanttViewProps) {
  const navigate = useNavigate();

  const { startDate, endDate, days, months } = useMemo(() => {
    if (projects.length === 0) {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(addMonths(now, 2));
      return {
        startDate: start,
        endDate: end,
        days: eachDayOfInterval({ start, end }),
        months: [now, addMonths(now, 1), addMonths(now, 2)],
      };
    }

    const dates = projects.flatMap((p) => [parseISO(p.startDate), parseISO(p.targetDate)]);
    const minDate = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const maxDate = endOfMonth(new Date(Math.max(...dates.map((d) => d.getTime()))));

    const allDays = eachDayOfInterval({ start: minDate, end: maxDate });
    const uniqueMonths: Date[] = [];
    allDays.forEach((day) => {
      if (!uniqueMonths.some((m) => format(m, 'yyyy-MM') === format(day, 'yyyy-MM'))) {
        uniqueMonths.push(startOfMonth(day));
      }
    });

    return {
      startDate: minDate,
      endDate: maxDate,
      days: allDays,
      months: uniqueMonths,
    };
  }, [projects]);

  const getBarStyle = (project: Project) => {
    const projectStart = parseISO(project.startDate);
    const projectEnd = parseISO(project.targetDate);
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const offsetDays = differenceInDays(projectStart, startDate);
    const durationDays = differenceInDays(projectEnd, projectStart) + 1;

    const left = (offsetDays / totalDays) * 100;
    const width = (durationDays / totalDays) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    };
  };

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'review':
        return 'bg-purple-500';
      case 'planning':
        return 'bg-gray-400';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header - Months */}
          <div className="flex border-b border-gray-200">
            <div className="w-64 flex-shrink-0 px-4 py-3 bg-gray-50 border-r border-gray-200">
              <span className="font-semibold text-gray-700">프로젝트</span>
            </div>
            <div className="flex-1 flex">
              {months.map((month) => {
                const daysInMonth = eachDayOfInterval({
                  start: startOfMonth(month),
                  end: endOfMonth(month),
                }).filter((d) => d >= startDate && d <= endDate).length;
                const totalDays = days.length;
                const width = (daysInMonth / totalDays) * 100;

                return (
                  <div
                    key={format(month, 'yyyy-MM')}
                    className="px-2 py-2 bg-gray-50 border-r border-gray-200 text-center"
                    style={{ width: `${width}%` }}
                  >
                    <span className="font-medium text-gray-700 text-sm">
                      {format(month, 'yyyy년 M월', { locale: ko })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Header - Days */}
          <div className="flex border-b border-gray-200">
            <div className="w-64 flex-shrink-0 px-4 py-2 bg-gray-50 border-r border-gray-200">
              <span className="text-sm text-gray-500">상태</span>
            </div>
            <div className="flex-1 flex">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 min-w-[24px] text-center text-xs py-1 border-r border-gray-100 ${
                    isWeekend(day) ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* Project Rows */}
          {projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">프로젝트가 없습니다</div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
              >
                <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{project.title}</p>
                      {'brand' in project && (
                        <p className="text-xs text-gray-500">{brandLabels[project.brand]}</p>
                      )}
                    </div>
                    <Badge className={`${statusColors[project.status]} text-xs whitespace-nowrap`}>
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 relative py-2">
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`flex-1 min-w-[24px] border-r border-gray-100 ${
                          isWeekend(day) ? 'bg-gray-50' : ''
                        }`}
                      />
                    ))}
                  </div>
                  {/* Gantt bar */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${getStatusBarColor(
                      project.status
                    )} opacity-80 hover:opacity-100 transition-opacity`}
                    style={getBarStyle(project)}
                  >
                    <div className="px-2 text-xs text-white font-medium truncate leading-6">
                      {project.title}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
