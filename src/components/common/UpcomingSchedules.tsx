import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Bell, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import { useStore } from '../../store/useStore';
import { scheduleTypeLabels, scheduleTypeColors } from '../../types';
import { formatDate, getDdayText } from '../../utils/helpers';

interface UpcomingSchedulesProps {
  days?: number;
  initialItems?: number;
  showTitle?: boolean;
}

export default function UpcomingSchedules({
  days = 14,
  initialItems = 5,
  showTitle = true,
}: UpcomingSchedulesProps) {
  const navigate = useNavigate();
  const { getUpcomingSchedules } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const allSchedules = getUpcomingSchedules(days);

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

  // 통계 계산
  const stats = useMemo(() => {
    const todayCount = allSchedules.filter(({ schedule }) => getUrgency(schedule.dueDate) === 'today').length;
    const tomorrowCount = allSchedules.filter(({ schedule }) => getUrgency(schedule.dueDate) === 'tomorrow').length;
    const laterCount = allSchedules.filter(({ schedule }) => getUrgency(schedule.dueDate) === 'later').length;
    return { todayCount, tomorrowCount, laterCount, total: allSchedules.length };
  }, [allSchedules]);

  const displaySchedules = isExpanded ? allSchedules : allSchedules.slice(0, initialItems);
  const hasMore = allSchedules.length > initialItems;

  if (allSchedules.length === 0) {
    return (
      <Card className="overflow-hidden">
        {showTitle && (
          <div className="px-5 py-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Bell className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">다가오는 일정</h3>
            </div>
          </div>
        )}
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">{days}일 내 예정된 일정이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">새로운 일정을 추가해보세요</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {showTitle && (
        <div className="px-5 py-4 bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 border-b border-primary-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Bell className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">다가오는 일정</h3>
                <p className="text-xs text-gray-500 mt-0.5">{days}일 이내 일정</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.todayCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-700">{stats.todayCount}</span>
                </div>
              )}
              {stats.tomorrowCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-semibold text-orange-700">{stats.tomorrowCount}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                <span className="text-xs font-medium text-gray-600">총 {stats.total}개</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`divide-y divide-gray-100 ${isExpanded ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
        {displaySchedules.map(({ schedule, project }, index) => {
          const urgency = getUrgency(schedule.dueDate);
          const dday = getDdayText(schedule.dueDate);

          return (
            <div
              key={schedule.id}
              onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
              className={`group relative p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                urgency === 'today'
                  ? 'bg-gradient-to-r from-red-50 to-transparent hover:from-red-100'
                  : urgency === 'tomorrow'
                  ? 'bg-gradient-to-r from-orange-50 to-transparent hover:from-orange-100'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* 왼쪽 인디케이터 바 */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  urgency === 'today'
                    ? 'bg-gradient-to-b from-red-500 to-red-400'
                    : urgency === 'tomorrow'
                    ? 'bg-gradient-to-b from-orange-500 to-orange-400'
                    : 'bg-gradient-to-b from-gray-300 to-gray-200'
                }`}
              />

              <div className="flex items-start gap-3 pl-2">
                {/* 상태 표시 아이콘 */}
                <div
                  className={`relative mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                    urgency === 'today'
                      ? 'bg-red-500 shadow-lg shadow-red-500/40'
                      : urgency === 'tomorrow'
                      ? 'bg-orange-500 shadow-lg shadow-orange-500/40'
                      : 'bg-blue-400'
                  }`}
                >
                  {urgency === 'today' && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${scheduleTypeColors[schedule.type]}15`,
                        color: scheduleTypeColors[schedule.type],
                        border: `1px solid ${scheduleTypeColors[schedule.type]}30`,
                      }}
                    >
                      {scheduleTypeLabels[schedule.type]}
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate group-hover:text-primary-700 transition-colors">
                      {schedule.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-2">
                    {project.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">
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
                      className={`${
                        urgency === 'today' ? 'animate-pulse' : ''
                      }`}
                    >
                      {dday}
                    </Badge>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 transition-all group-hover:text-primary-500 group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 더보기/접기 버튼 */}
      {hasMore && (
        <div className="border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-all group"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                <span>접기</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                <span>전체 보기 ({allSchedules.length - initialItems}개 더보기)</span>
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}
