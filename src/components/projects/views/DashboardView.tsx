import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Target } from 'lucide-react';
import Card from '../../common/Card';
import { Project, ProjectType, ProjectStatus, Priority } from '../../../types';
import { statusLabels, priorityLabels } from '../../../utils/helpers';

interface DashboardViewProps {
  projects: Project[];
  type: ProjectType;
}

const statusChartColors: Record<ProjectStatus, string> = {
  planning: '#9CA3AF',
  in_progress: '#3B82F6',
  review: '#8B5CF6',
  completed: '#22C55E',
  on_hold: '#F59E0B',
  cancelled: '#EF4444',
};

const priorityChartColors: Record<Priority, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export default function DashboardView({ projects, type }: DashboardViewProps) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'in_progress').length;
    const overdue = projects.filter((p) => {
      if (p.status === 'completed' || p.status === 'cancelled') return false;
      return new Date(p.targetDate) < new Date();
    }).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate };
  }, [projects]);

  const statusData = useMemo(() => {
    const counts: Record<ProjectStatus, number> = {
      planning: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
    };

    projects.forEach((p) => {
      counts[p.status]++;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status as ProjectStatus],
        value: count,
        color: statusChartColors[status as ProjectStatus],
      }));
  }, [projects]);

  const priorityData = useMemo(() => {
    const counts: Record<Priority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    projects.forEach((p) => {
      counts[p.priority]++;
    });

    return Object.entries(counts).map(([priority, count]) => ({
      name: priorityLabels[priority as Priority],
      value: count,
      fill: priorityChartColors[priority as Priority],
    }));
  }, [projects]);

  const monthlyData = useMemo(() => {
    const months: { month: string; created: number; completed: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthKey = format(monthStart, 'yyyy-MM');
      const monthLabel = format(monthStart, 'M월', { locale: ko });

      const created = projects.filter(
        (p) => format(parseISO(p.createdAt), 'yyyy-MM') === monthKey
      ).length;

      const completed = projects.filter(
        (p) => p.completedDate && format(parseISO(p.completedDate), 'yyyy-MM') === monthKey
      ).length;

      months.push({ month: monthLabel, created, completed });
    }

    return months;
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [projects]);

  const urgentProjects = useMemo(() => {
    return projects
      .filter((p) => p.priority === 'urgent' && p.status !== 'completed' && p.status !== 'cancelled')
      .slice(0, 5);
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">전체 프로젝트</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">완료</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <span className="text-sm text-green-600 font-medium">{stats.completionRate}%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">진행 중</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
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
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">상태별 분포</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Priority Bar Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">우선순위별 분포</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 추이</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#3B82F6"
                strokeWidth={2}
                name="생성"
                dot={{ fill: '#3B82F6' }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#22C55E"
                strokeWidth={2}
                name="완료"
                dot={{ fill: '#22C55E' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent & Urgent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 업데이트</h3>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-center text-gray-400 py-4">프로젝트 없음</p>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{project.title}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(project.updatedAt), 'M/d HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">긴급 프로젝트</h3>
          <div className="space-y-3">
            {urgentProjects.length === 0 ? (
              <p className="text-center text-gray-400 py-4">긴급 프로젝트 없음</p>
            ) : (
              urgentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                  onClick={() => navigate(`/${type.replace('_', '-')}/${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{project.title}</p>
                    <p className="text-sm text-gray-500">{statusLabels[project.status]}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
