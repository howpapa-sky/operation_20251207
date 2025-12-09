import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Circle, CheckCircle, Clock, AlertCircle, PauseCircle, XCircle } from 'lucide-react';
import Badge from '../../common/Badge';
import { Project, ProjectType } from '../../../types';
import { statusLabels, statusColors, priorityLabels, brandLabels } from '../../../utils/helpers';

interface TimelineViewProps {
  projects: Project[];
  type: ProjectType;
}

interface TimelineEvent {
  id: string;
  projectId: string;
  title: string;
  date: Date;
  eventType: 'start' | 'target' | 'completed';
  project: Project;
}

export default function TimelineView({ projects, type }: TimelineViewProps) {
  const navigate = useNavigate();

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    projects.forEach((project) => {
      allEvents.push({
        id: `${project.id}-start`,
        projectId: project.id,
        title: project.title,
        date: parseISO(project.startDate),
        eventType: 'start',
        project,
      });

      allEvents.push({
        id: `${project.id}-target`,
        projectId: project.id,
        title: project.title,
        date: parseISO(project.targetDate),
        eventType: 'target',
        project,
      });

      if (project.completedDate) {
        allEvents.push({
          id: `${project.id}-completed`,
          projectId: project.id,
          title: project.title,
          date: parseISO(project.completedDate),
          eventType: 'completed',
          project,
        });
      }
    });

    return allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [projects]);

  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: TimelineEvent[] } = {};

    events.forEach((event) => {
      const key = format(event.date, 'yyyy-MM');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const getEventIcon = (eventType: string, status: string) => {
    if (eventType === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (eventType === 'start') {
      return <Circle className="w-5 h-5 text-blue-500" />;
    }
    // target
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'on_hold':
        return <PauseCircle className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'start':
        return '시작';
      case 'target':
        return '목표';
      case 'completed':
        return '완료';
      default:
        return '';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'start':
        return 'bg-blue-100 text-blue-700';
      case 'target':
        return 'bg-orange-100 text-orange-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {groupedEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">타임라인에 표시할 이벤트가 없습니다</div>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map(([monthKey, monthEvents]) => (
            <div key={monthKey}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">
                {format(parseISO(`${monthKey}-01`), 'yyyy년 M월', { locale: ko })}
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                  {monthEvents.map((event) => {
                    const isPast = isBefore(event.date, today);
                    const isToday = format(event.date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                    return (
                      <div
                        key={event.id}
                        className={`relative flex items-start gap-4 pl-12 cursor-pointer group ${
                          isPast && !isToday ? 'opacity-60' : ''
                        }`}
                        onClick={() => navigate(`/${type.replace('_', '-')}/${event.projectId}`)}
                      >
                        {/* Icon */}
                        <div
                          className={`absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full bg-white flex items-center justify-center ${
                            isToday ? 'ring-2 ring-primary-500' : ''
                          }`}
                        >
                          {getEventIcon(event.eventType, event.project.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 group-hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${getEventColor(event.eventType)}`}>
                                  {getEventLabel(event.eventType)}
                                </span>
                                {isToday && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-700">
                                    오늘
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                              {'brand' in event.project && (
                                <p className="text-sm text-gray-500">{brandLabels[event.project.brand]}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {format(event.date, 'M/d (EEE)', { locale: ko })}
                              </p>
                              <Badge className={`${statusColors[event.project.status]} text-xs`}>
                                {statusLabels[event.project.status]}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
