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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useStore } from '../store/useStore';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-1">
            안녕하세요, {user?.name}님! 오늘의 프로젝트 현황입니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/sampling/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          새 프로젝트
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 프로젝트</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">12%</span>
            <span className="text-gray-500">지난달 대비</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="progress-bar">
              <div
                className="progress-fill bg-green-500"
                style={{
                  width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              완료율 {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">진행중</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm">
            {stats.onHold > 0 && (
              <>
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 font-medium">{stats.onHold}</span>
                <span className="text-gray-500">보류</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">예산 사용</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.usedBudget)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              총 예산: {formatCurrency(stats.totalBudget)}
            </p>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project by Type Pie Chart */}
        <Card>
          <CardHeader title="프로젝트 유형별 현황" />
          <div className="h-72">
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
          <div className="flex flex-wrap gap-3 mt-4 px-6 pb-6">
            {projectsByType.map((item, index) => (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader title="월별 프로젝트 추이" />
          <div className="h-72">
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
        </Card>
      </div>

      {/* Calendar & Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2" padding="none">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">프로젝트 캘린더</h3>
            </div>
          </div>
          <div className="p-4">
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
              height={400}
              eventClick={(info) => {
                const event = calendarEvents.find((e) => e.id === info.event.id);
                if (event) {
                  navigate(`/${event.projectType}/${event.projectId}`);
                }
              }}
            />
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card padding="none">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">마감 임박</h3>
              </div>
              <button
                onClick={() => navigate('/sampling')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                전체 보기 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                마감 임박 프로젝트가 없습니다
              </div>
            ) : (
              upcomingDeadlines.map((project) => {
                const Icon = typeIcons[project.type];
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          projectTypeColors[project.type].replace('text-', 'bg-').split(' ')[0]
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${projectTypeColors[project.type].split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{project.title}</p>
                        <p className="text-sm text-gray-500">{formatDate(project.targetDate)}</p>
                      </div>
                      <Badge
                        variant={
                          parseInt(getDdayText(project.targetDate).replace('D-', '')) <= 3
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {getDdayText(project.targetDate)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">최근 프로젝트</h3>
            <button
              onClick={() => navigate('/sampling')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">프로젝트명</th>
                <th className="table-header">유형</th>
                <th className="table-header">상태</th>
                <th className="table-header">우선순위</th>
                <th className="table-header">목표일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    프로젝트가 없습니다. 새 프로젝트를 만들어보세요!
                  </td>
                </tr>
              ) : (
                recentProjects.map((project) => {
                  const Icon = typeIcons[project.type];
                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/${project.type.replace('_', '-')}/${project.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <td className="table-cell">
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
                      </td>
                      <td className="table-cell">
                        <Badge className={projectTypeColors[project.type]}>
                          {projectTypeLabels[project.type]}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge className={statusColors[project.status]}>
                          {statusLabels[project.status]}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge className={priorityColors[project.priority]}>
                          {priorityLabels[project.priority]}
                        </Badge>
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(project.targetDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(projectTypeLabels).map(([type, label]) => {
          const Icon = typeIcons[type as ProjectType];
          return (
            <Card
              key={type}
              hover
              onClick={() => navigate(`/${type.replace('_', '-')}/new`)}
              className="p-4 text-center"
            >
              <div
                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                  projectTypeColors[type as ProjectType].replace('text-', 'bg-').split(' ')[0]
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${projectTypeColors[type as ProjectType].split(' ')[1]}`}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-1">새로 만들기</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
