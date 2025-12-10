import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, AlertCircle, ChevronRight, Bell } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import { useStore } from '../../store/useStore';
import { scheduleTypeLabels, scheduleTypeColors } from '../../types';
import { formatDate, getDdayText } from '../../utils/helpers';

interface UpcomingSchedulesProps {
  days?: number;
  maxItems?: number;
  showTitle?: boolean;
}

export default function UpcomingSchedules({
  days = 7,
  maxItems = 5,
  showTitle = true,
}: UpcomingSchedulesProps) {
  const navigate = useNavigate();
  const { getUpcomingSchedules } = useStore();

  const upcomingSchedules = getUpcomingSchedules(days).slice(0, maxItems);

  // 오늘/내일/이번주 분류
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const getUrgency = (dueDate: string) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due.getTime() === today.getTime()) return 'today';
    if (due.getTime() === tomorrow.getTime()) return 'tomorrow';
    return 'later';
  };

  if (upcomingSchedules.length === 0) {
    return (
      <Card className="p-5">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">다가오는 일정</h3>
          </div>
        )}
        <div className="text-center py-6 text-gray-500">
          <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{days}일 내 예정된 일정이 없습니다.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">다가오는 일정</h3>
            <span className="text-sm text-gray-500">({upcomingSchedules.length}개)</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {upcomingSchedules.map(({ schedule, project }) => {
          const urgency = getUrgency(schedule.dueDate);
          const dday = getDdayText(schedule.dueDate);

          return (
            <div
              key={schedule.id}
              onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
              className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                urgency === 'today'
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : urgency === 'tomorrow'
                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full ${
                    urgency === 'today'
                      ? 'bg-red-500'
                      : urgency === 'tomorrow'
                      ? 'bg-orange-500'
                      : 'bg-gray-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${scheduleTypeColors[schedule.type]}20`,
                        color: scheduleTypeColors[schedule.type],
                      }}
                    >
                      {scheduleTypeLabels[schedule.type]}
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {schedule.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {project.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      {formatDate(schedule.dueDate)}
                    </span>
                    <Badge
                      variant={
                        urgency === 'today'
                          ? 'danger'
                          : urgency === 'tomorrow'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      {dday}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
