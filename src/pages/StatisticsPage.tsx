import { useMemo, useState } from 'react';
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
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Download,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useStore } from '../store/useStore';
import {
  formatCurrency,
  formatDate,
  projectTypeLabels,
  statusLabels,
  brandLabels,
  generateChartColors,
  exportToCSV,
} from '../utils/helpers';
import { ProjectType, ProjectStatus, SamplingProject } from '../types';

const CHART_COLORS = generateChartColors(10);

export default function StatisticsPage() {
  const { projects } = useStore();
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180' | '365'>('all');

  // 날짜 필터링된 프로젝트
  const filteredProjects = useMemo(() => {
    if (dateRange === 'all') return projects;

    const days = parseInt(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return projects.filter((p) => new Date(p.createdAt) >= cutoff);
  }, [projects, dateRange]);

  // 전체 통계
  const totalStats = useMemo(() => {
    const total = filteredProjects.length;
    const completed = filteredProjects.filter((p) => p.status === 'completed').length;
    const inProgress = filteredProjects.filter((p) => p.status === 'in_progress').length;
    const overdue = filteredProjects.filter((p) => {
      if (p.status === 'completed' || p.status === 'cancelled') return false;
      return new Date(p.targetDate) < new Date();
    }).length;

    const totalBudget = filteredProjects.reduce((sum, p) => {
      if ('budget' in p) return sum + (p.budget || 0);
      if ('totalAmount' in p) return sum + (p.totalAmount || 0);
      if ('revenue' in p) return sum + (p.revenue || 0);
      return sum;
    }, 0);

    const usedBudget = filteredProjects.reduce((sum, p) => {
      if ('actualCost' in p) return sum + (p.actualCost || 0);
      return sum;
    }, 0);

    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalBudget,
      usedBudget,
    };
  }, [filteredProjects]);

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

    filteredProjects.forEach((p) => types[p.type]++);

    return Object.entries(types)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: projectTypeLabels[type as ProjectType],
        value: count,
        type,
      }));
  }, [filteredProjects]);

  // 상태별 통계
  const projectsByStatus = useMemo(() => {
    const statuses: Record<ProjectStatus, number> = {
      planning: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
    };

    filteredProjects.forEach((p) => statuses[p.status]++);

    return Object.entries(statuses)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status as ProjectStatus],
        value: count,
        status,
      }));
  }, [filteredProjects]);

  // 월별 추이
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { created: number; completed: number }> = {};

    filteredProjects.forEach((p) => {
      const month = formatDate(p.createdAt, 'yyyy-MM');
      if (!months[month]) months[month] = { created: 0, completed: 0 };
      months[month].created++;

      if (p.completedDate) {
        const completedMonth = formatDate(p.completedDate, 'yyyy-MM');
        if (!months[completedMonth]) months[completedMonth] = { created: 0, completed: 0 };
        months[completedMonth].completed++;
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: formatDate(month + '-01', 'yy.MM'),
        생성: data.created,
        완료: data.completed,
      }));
  }, [filteredProjects]);

  // 예산 통계 (타입별)
  const budgetByType = useMemo(() => {
    const budgets: Record<string, number> = {};

    filteredProjects.forEach((p) => {
      const typeName = projectTypeLabels[p.type];
      if (!budgets[typeName]) budgets[typeName] = 0;

      if ('budget' in p) budgets[typeName] += p.budget || 0;
      if ('totalAmount' in p) budgets[typeName] += p.totalAmount || 0;
      if ('revenue' in p) budgets[typeName] += p.revenue || 0;
    });

    return Object.entries(budgets)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredProjects]);

  // 샘플링 평점 통계
  const samplingRatings = useMemo(() => {
    const samplingProjects = filteredProjects.filter(
      (p) => p.type === 'sampling'
    ) as SamplingProject[];

    if (samplingProjects.length === 0) return [];

    const categoryRatings: Record<string, { total: number; count: number }> = {};

    samplingProjects.forEach((p) => {
      if (!categoryRatings[p.category]) {
        categoryRatings[p.category] = { total: 0, count: 0 };
      }
      if (p.averageRating) {
        categoryRatings[p.category].total += p.averageRating;
        categoryRatings[p.category].count++;
      }
    });

    return Object.entries(categoryRatings)
      .map(([category, data]) => ({
        category,
        avgRating: data.count > 0 ? (data.total / data.count).toFixed(1) : '0',
        count: data.count,
      }))
      .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating));
  }, [filteredProjects]);

  // 목표 달성/미달성 현황
  const goalAchievement = useMemo(() => {
    const completed = filteredProjects.filter((p) => p.status === 'completed');

    const onTime = completed.filter((p) => {
      if (!p.completedDate) return true;
      return new Date(p.completedDate) <= new Date(p.targetDate);
    }).length;

    const late = completed.length - onTime;

    return [
      { name: '목표 달성', value: onTime, color: '#22c55e' },
      { name: '목표 미달성', value: late, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [filteredProjects]);

  const handleExportStats = () => {
    const exportData = filteredProjects.map((p) => ({
      프로젝트명: p.title,
      유형: projectTypeLabels[p.type],
      상태: statusLabels[p.status],
      시작일: formatDate(p.startDate),
      목표일: formatDate(p.targetDate),
      완료일: p.completedDate ? formatDate(p.completedDate) : '-',
    }));
    exportToCSV(exportData, `통계_${formatDate(new Date(), 'yyyyMMdd')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">통계</h1>
            <p className="text-gray-500">프로젝트 현황 및 성과 분석</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="select-field w-40"
          >
            <option value="all">전체 기간</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
            <option value="180">최근 6개월</option>
            <option value="365">최근 1년</option>
          </select>
          <button onClick={handleExportStats} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 프로젝트</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료율</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.completionRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 progress-bar">
            <div
              className="progress-fill bg-green-500"
              style={{ width: `${totalStats.completionRate}%` }}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">진행중</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.inProgress}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          {totalStats.overdue > 0 && (
            <div className="mt-3 flex items-center gap-1 text-sm">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-red-600 font-medium">{totalStats.overdue}</span>
              <span className="text-gray-500">지연</span>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 예산</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalStats.totalBudget)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Type */}
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
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {projectsByType.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
        </Card>

        {/* Projects by Status */}
        <Card>
          <CardHeader title="프로젝트 상태별 현황" />
          <div className="h-72">
            {projectsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader title="월별 프로젝트 추이" />
          <div className="h-72">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="생성"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="완료"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </Card>

        {/* Goal Achievement */}
        <Card>
          <CardHeader title="목표 달성 현황" />
          <div className="h-72">
            {goalAchievement.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalAchievement}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {goalAchievement.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                완료된 프로젝트가 없습니다
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Budget by Type */}
      <Card>
        <CardHeader title="프로젝트별 예산 현황" />
        <div className="h-72">
          {budgetByType.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              데이터가 없습니다
            </div>
          )}
        </div>
      </Card>

      {/* Sampling Ratings */}
      {samplingRatings.length > 0 && (
        <Card>
          <CardHeader title="샘플링 카테고리별 평점" subtitle="평균 평점 순" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">순위</th>
                  <th className="table-header">카테고리</th>
                  <th className="table-header">평균 평점</th>
                  <th className="table-header">샘플 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {samplingRatings.map((item, index) => (
                  <tr key={item.category}>
                    <td className="table-cell">
                      <Badge
                        variant={index === 0 ? 'warning' : index === 1 ? 'gray' : index === 2 ? 'warning' : 'gray'}
                      >
                        {index + 1}위
                      </Badge>
                    </td>
                    <td className="table-cell font-medium">{item.category}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${(parseFloat(item.avgRating) / 5) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">{item.avgRating}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-500">{item.count}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
