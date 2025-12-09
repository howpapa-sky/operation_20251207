import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Project, ProjectType } from '../../../types';
import { statusLabels, brandLabels } from '../../../utils/helpers';

interface CalendarViewProps {
  projects: Project[];
  type: ProjectType;
}

const statusColorMap: Record<string, string> = {
  planning: '#9CA3AF',
  in_progress: '#3B82F6',
  review: '#8B5CF6',
  completed: '#22C55E',
  on_hold: '#F59E0B',
  cancelled: '#EF4444',
};

export default function CalendarView({ projects, type }: CalendarViewProps) {
  const navigate = useNavigate();

  const events = useMemo(() => {
    return projects.flatMap((project) => {
      const events = [];
      const baseColor = statusColorMap[project.status] || '#6B7280';
      const brandInfo = 'brand' in project ? ` [${brandLabels[project.brand]}]` : '';

      // Start date event
      events.push({
        id: `${project.id}-start`,
        title: `[시작] ${project.title}${brandInfo}`,
        start: project.startDate,
        backgroundColor: baseColor,
        borderColor: baseColor,
        extendedProps: {
          projectId: project.id,
          type: 'start',
          status: project.status,
        },
      });

      // Target date event
      events.push({
        id: `${project.id}-target`,
        title: `[목표] ${project.title}${brandInfo}`,
        start: project.targetDate,
        backgroundColor: baseColor,
        borderColor: baseColor,
        extendedProps: {
          projectId: project.id,
          type: 'target',
          status: project.status,
        },
      });

      // Completed date event (if exists)
      if (project.completedDate) {
        events.push({
          id: `${project.id}-completed`,
          title: `[완료] ${project.title}${brandInfo}`,
          start: project.completedDate,
          backgroundColor: '#22C55E',
          borderColor: '#22C55E',
          extendedProps: {
            projectId: project.id,
            type: 'completed',
            status: project.status,
          },
        });
      }

      return events;
    });
  }, [projects]);

  const handleEventClick = (info: { event: { extendedProps: Record<string, unknown> } }) => {
    const projectId = info.event.extendedProps.projectId as string;
    if (projectId) {
      navigate(`/${type.replace('_', '-')}/${projectId}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        events={events}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek',
        }}
        buttonText={{
          today: '오늘',
          month: '월',
          week: '주',
        }}
        height="auto"
        eventDisplay="block"
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: false,
        }}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n}개 더보기`}
      />

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColorMap[status] }}
              />
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
