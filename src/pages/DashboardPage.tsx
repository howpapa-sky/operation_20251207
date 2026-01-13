import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Calendar,
  Beaker,
  FileImage,
  Users,
  Package,
  ShoppingCart,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useStore } from '../store/useStore';
import UpcomingSchedules from '../components/common/UpcomingSchedules';
import {
  formatCurrency,
  formatDate,
  getDdayText,
  statusLabels,
  statusColors,
  projectTypeLabels,
  projectTypeColors,
  priorityLabels,
  priorityColors,
} from '../utils/helpers';
import { ProjectType, CalendarEvent } from '../types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

const typeIcons: Record<ProjectType, React.ElementType> = {
  sampling: Beaker,
  detail_page: FileImage,
  influencer: Users,
  product_order: Package,
  group_purchase: ShoppingCart,
  other: FolderOpen,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects, user } = useStore();

  // 통계 계산
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'in_progress').length;
    const onHold = projects.filter((p) => p.status === 'on_hold').length;

    const totalBudget = projects.reduce((sum, p) => {
      if ('budget' in p && typeof p.budget === 'number') return sum + p.budget;
      if ('totalAmount' in p && typeof p.totalAmount === 'number') return sum + p.totalAmount;
      return sum;
    }, 0);

    const usedBudget = projects.reduce((sum, p) => {
      if ('actualCost' in p && typeof p.actualCost === 'number') return sum + p.actualCost;
      return sum;
    }, 0);

    return { total, completed, inProgress, onHold, totalBudget, usedBudget };
  }, [projects]);

  // 프로젝트 타입별 통계
  const projectsByType = useMemo(() => {
    const types: Record<ProjectType, number> = {
      sampling: 0,
      detail_page: 0,
      influencer: 0,
      product_order: 0,
      group_purchase: 0,
      other: 0,
    };

    projects.forEach((p) => {
      types[p.type]++;
    });

    return Object.entries(types)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: projectTypeLabels[type as ProjectType],
        value: count,
        type: type as ProjectType,
      }));
  }, [projects]);

  // 월별 프로젝트 통계
  const monthlyStats = useMemo(() => {
    const months: Record<string, { created: number; completed: number }> = {};

    projects.forEach((p) => {
      const createdMonth = formatDate(p.createdAt, 'yyyy-MM');
      if (!months[createdMonth]) {
        months[createdMonth] = { created: 0, completed: 0 };
      }
      months[createdMonth].created++;

      if (p.completedDate) {
        const completedMonth = formatDate(p.completedDate, 'yyyy-MM');
        if (!months[completedMonth]) {
          months[completedMonth] = { created: 0, completed: 0 };
        }
        months[completedMonth].completed++;
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: formatDate(month + '-01', 'M월'),
        생성: data.created,
        완료: data.completed,
      }));
  }, [projects]);

  // 캘린더 이벤트
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return projects.flatMap((p) => {
      const events: CalendarEvent[] = [];
      const typeColor = {
        sampling: '#ec4899',
        detail_page: '#6366f1',
        influencer: '#f97316',
        product_order: '#06b6d4',
        group_purchase: '#22c55e',
        other: '#6b7280',
      };

      events.push({
        id: `${p.id}-start`,
        title: `[시작] ${p.title}`,
        start: p.startDate,
        projectId: p.id,
        projectType: p.type,
        eventType: 'start',
        color: typeColor[p.type],
      });

      events.push({
        id: `${p.id}-target`,
        title: `[목표] ${p.title}`,
        start: p.targetDate,
        projectId: p.id,
        projectType: p.type,
        eventType: 'target',
        color: '#ef4444',
      });

      if (p.completedDate) {
        events.push({
          id: `${p.id}-completed`,
          title: `[완료] ${p.title}`,
          start: p.completedDate,
          projectId: p.id,
          projectType: p.type,
          eventType: 'completed',
          color: '#22c55e',
        });
      }

      return events;
    });
  }, [projects]);

  // 최근 프로젝트
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [projects]);

  // 마감 임박 프로젝트
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    return [...projects]
      .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
      .filter((p) => new Date(p.targetDate) >= today)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 5);
  }, [projects]);

  // 지연된 프로젝트 (마감일 지났지만 미완료)
  const delayedProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...projects]
      .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
      .filter((p) => new Date(p.targetDate) < today)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 5);
  }, [projects]);

  // 지연 일수 계산
  const getDelayDays = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base truncate">
            안녕하세요, {user?.name}님!
          </p>
        </div>
        <Button onClick={() => navigate('/sampling/new')} className="gap-2">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">새 프로젝트</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">전체 프로젝트</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 md:mt-4 flex items-center gap-1 text-xs md:text-sm">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
              <span className="text-green-600 font-medium">12%</span>
              <span className="text-gray-500 hidden sm:inline">지난달 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">완료</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 md:mt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-2">
                완료율 {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-yellow-500">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">진행중</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-3 md:mt-4 flex items-center gap-1 text-xs md:text-sm">
              {stats.onHold > 0 && (
                <>
                  <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">{stats.onHold}</span>
                  <span className="text-gray-500">보류</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">예산 사용</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.usedBudget)}
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-purple-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 md:mt-4">
              <p className="text-xs md:text-sm text-gray-500 truncate">
                총: {formatCurrency(stats.totalBudget)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 다가오는 세부 일정 & 지연된 일정 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 다가오는 세부 일정 */}
        <UpcomingSchedules days={14} initialItems={5} />

        {/* 지연된 일정 */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <CardTitle className="text-base">지연된 일정</CardTitle>
              </div>
              {delayedProjects.length > 0 && (
                <Badge variant="destructive">{delayedProjects.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[240px] overflow-y-auto">
              {delayedProjects.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  지연된 프로젝트가 없습니다
                </div>
              ) : (
                delayedProjects.map((project) => {
                  const Icon = typeIcons[project.type];
                  const delayDays = getDelayDays(project.targetDate);
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                      className="p-3 hover:bg-red-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            projectTypeColors[project.type].replace('text-', 'bg-').split(' ')[0]
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${projectTypeColors[project.type].split(' ')[1]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                          <p className="text-xs text-gray-500">
                            마감: {formatDate(project.targetDate)}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {delayDays}일 지연
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar & Deadlines Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 hidden sm:block">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">프로젝트 캘린더</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <style>{`
              .calendar-compact .fc {
                font-size: 11px;
              }
              .calendar-compact .fc-toolbar-title {
                font-size: 14px !important;
              }
              .calendar-compact .fc-button {
                padding: 4px 8px !important;
                font-size: 11px !important;
              }
              .calendar-compact .fc-daygrid-day-number {
                font-size: 11px;
                padding: 2px 4px;
              }
              .calendar-compact .fc-event {
                font-size: 10px;
                padding: 1px 3px;
              }
              .calendar-compact .fc-col-header-cell-cushion {
                font-size: 11px;
                padding: 4px;
              }
              .calendar-compact .fc-daygrid-day-frame {
                min-height: 60px;
              }
            `}</style>
            <div className="calendar-compact">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale="ko"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
                events={calendarEvents.map((e) => ({
                  id: e.id,
                  title: e.title,
                  start: e.start,
                  backgroundColor: e.color,
                  borderColor: e.color,
                }))}
                height={280}
                eventClick={(info) => {
                  const event = calendarEvents.find((e) => e.id === info.event.id);
                  if (event) {
                    navigate(`/${event.projectType}/${event.projectId}`);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-base">마감 임박</CardTitle>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                {upcomingDeadlines.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[260px] overflow-y-auto">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  마감 임박 프로젝트가 없습니다
                </div>
              ) : (
                upcomingDeadlines.map((project) => {
                  const Icon = typeIcons[project.type];
                  const dday = getDdayText(project.targetDate);
                  const isUrgent = parseInt(dday.replace('D-', '')) <= 3;
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            projectTypeColors[project.type].replace('text-', 'bg-').split(' ')[0]
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${projectTypeColors[project.type].split(' ')[1]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(project.targetDate)}</p>
                        </div>
                        <Badge variant={isUrgent ? 'destructive' : 'outline'} className={cn(!isUrgent && 'bg-orange-50 text-orange-600 border-orange-200')}>
                          {dday}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Project by Type Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">프로젝트 유형별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-72">
              {projectsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectsByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-4">
              {projectsByType.map((item, index) => (
                <div key={item.type} className="flex items-center gap-1 md:gap-2">
                  <div
                    className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-xs md:text-sm text-gray-600">{item.name}</span>
                  <span className="text-xs md:text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">월별 프로젝트 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-72">
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="생성"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="완료"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">최근 프로젝트</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sampling')}
              className="gap-1 text-primary"
            >
              전체 보기 <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile view - card style */}
          <div className="md:hidden divide-y">
            {recentProjects.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                프로젝트가 없습니다. 새 프로젝트를 만들어보세요!
              </div>
            ) : (
              recentProjects.map((project) => {
                const Icon = typeIcons[project.type];
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          projectTypeColors[project.type].replace('text-', 'bg-').split(' ')[0]
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${projectTypeColors[project.type].split(' ')[1]}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{project.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`${statusColors[project.status]} text-xs`}>
                            {statusLabels[project.status]}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDate(project.targetDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop view - table style */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>목표일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      프로젝트가 없습니다. 새 프로젝트를 만들어보세요!
                    </TableCell>
                  </TableRow>
                ) : (
                  recentProjects.map((project) => {
                    const Icon = typeIcons[project.type];
                    return (
                      <TableRow
                        key={project.id}
                        onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                projectTypeColors[project.type].replace('text-', 'bg-').split(' ')[0]
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 ${projectTypeColors[project.type].split(' ')[1]}`}
                              />
                            </div>
                            <span className="font-medium">{project.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={projectTypeColors[project.type]}>
                            {projectTypeLabels[project.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priorityColors[project.priority]}>
                            {priorityLabels[project.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {formatDate(project.targetDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        {Object.entries(projectTypeLabels).map(([type, label]) => {
          const Icon = typeIcons[type as ProjectType];
          return (
            <Card
              key={type}
              className="hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/${type.replace('_', '-')}/new`)}
            >
              <CardContent className="p-2 md:p-4 text-center">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 mx-auto rounded-lg md:rounded-xl flex items-center justify-center ${
                    projectTypeColors[type as ProjectType].replace('text-', 'bg-').split(' ')[0]
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 md:w-6 md:h-6 ${projectTypeColors[type as ProjectType].split(' ')[1]}`}
                  />
                </div>
                <p className="mt-2 md:mt-3 text-xs md:text-sm font-medium text-gray-900 truncate">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 md:mt-1 hidden sm:block">새로 만들기</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
