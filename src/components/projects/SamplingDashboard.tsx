import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Star, TrendingUp, Package, Factory, Filter, Sparkles, MessageCircle, Send } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import CombinedEmailGenerator from './CombinedEmailGenerator';
import { SamplingProject, ProductCategory, Brand, Manufacturer } from '../../types';
import { brandLabels, statusLabels, statusColors } from '../../utils/helpers';
import { sendNaverWorksMessage } from '../../lib/sendNaverWorks';

interface SamplingDashboardProps {
  projects: SamplingProject[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const categoryColors: Record<ProductCategory, string> = {
  '크림': '#6366f1',
  '패드': '#8b5cf6',
  '로션': '#a855f7',
  '스틱': '#d946ef',
  '앰플': '#ec4899',
  '세럼': '#f43f5e',
  '미스트': '#f97316',
  '클렌저': '#eab308',
  '선크림': '#22c55e',
  '마스크팩': '#14b8a6',
  '기타': '#64748b',
};

export default function SamplingDashboard({ projects }: SamplingDashboardProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | ''>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | ''>('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | ''>('');
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  // 메신저 알림 전송
  const handleSendNotification = async () => {
    if (filteredProjects.length === 0) return;

    setSendingNotification(true);
    try {
      // 요약 정보 생성
      const avgRating = filteredProjects.reduce((sum, p) => sum + (p.averageRating ?? 0), 0) / filteredProjects.length;
      const highRated = filteredProjects.filter(p => (p.averageRating ?? 0) >= 4).length;
      const lowRated = filteredProjects.filter(p => (p.averageRating ?? 0) < 3).length;

      let filterInfo = '';
      if (selectedCategory) filterInfo += `카테고리: ${selectedCategory}\n`;
      if (selectedBrand) filterInfo += `브랜드: ${brandLabels[selectedBrand]}\n`;
      if (selectedManufacturer) filterInfo += `제조사: ${selectedManufacturer}\n`;

      const message = `📊 [샘플링 현황 리포트]

${filterInfo ? `🔍 필터 조건:\n${filterInfo}\n` : ''}📦 총 샘플: ${filteredProjects.length}개
⭐ 평균 평점: ${avgRating.toFixed(2)}점
✅ 고평점 (4점↑): ${highRated}개
⚠️ 저평점 (3점↓): ${lowRated}개

📋 최근 샘플 TOP 5:
${filteredProjects
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)
  .map((p, i) => `${i + 1}. ${p.title} (${brandLabels[p.brand]}) - ${p.averageRating?.toFixed(1) || '-'}점`)
  .join('\n')}

📅 ${new Date().toLocaleString('ko-KR')}`;

      const result = await sendNaverWorksMessage({ message });

      if (result.success) {
        alert('메신저로 알림을 전송했습니다.');
      } else {
        alert(`알림 전송 실패: ${result.error}`);
      }
    } catch (error) {
      alert(`오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setSendingNotification(false);
    }
  };

  // 필터링된 프로젝트
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (selectedManufacturer && p.manufacturer !== selectedManufacturer) return false;
      return true;
    });
  }, [projects, selectedCategory, selectedBrand, selectedManufacturer]);

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgRating: number; totalRating: number; projects: SamplingProject[] }> = {};

    filteredProjects.forEach((p) => {
      if (!stats[p.category]) {
        stats[p.category] = { count: 0, avgRating: 0, totalRating: 0, projects: [] };
      }
      stats[p.category].count++;
      stats[p.category].totalRating += p.averageRating ?? 0;
      stats[p.category].projects.push(p);
    });

    Object.keys(stats).forEach((key) => {
      stats[key].avgRating = stats[key].count > 0
        ? stats[key].totalRating / stats[key].count
        : 0;
    });

    return Object.entries(stats).map(([category, data]) => ({
      category,
      count: data.count,
      avgRating: Number(data.avgRating.toFixed(2)),
      projects: data.projects,
    })).sort((a, b) => b.count - a.count);
  }, [filteredProjects]);

  // 제조사별 통계
  const manufacturerStats = useMemo(() => {
    const stats: Record<string, { count: number; avgRating: number; totalRating: number; projects: SamplingProject[] }> = {};

    filteredProjects.forEach((p) => {
      if (!stats[p.manufacturer]) {
        stats[p.manufacturer] = { count: 0, avgRating: 0, totalRating: 0, projects: [] };
      }
      stats[p.manufacturer].count++;
      stats[p.manufacturer].totalRating += p.averageRating ?? 0;
      stats[p.manufacturer].projects.push(p);
    });

    Object.keys(stats).forEach((key) => {
      stats[key].avgRating = stats[key].count > 0
        ? stats[key].totalRating / stats[key].count
        : 0;
    });

    return Object.entries(stats).map(([manufacturer, data]) => ({
      manufacturer,
      count: data.count,
      avgRating: Number(data.avgRating.toFixed(2)),
      projects: data.projects,
    }));
  }, [filteredProjects]);

  // 브랜드별 통계
  const brandStats = useMemo(() => {
    const stats: Record<string, { count: number; avgRating: number; totalRating: number }> = {};

    filteredProjects.forEach((p) => {
      if (!stats[p.brand]) {
        stats[p.brand] = { count: 0, avgRating: 0, totalRating: 0 };
      }
      stats[p.brand].count++;
      stats[p.brand].totalRating += p.averageRating ?? 0;
    });

    Object.keys(stats).forEach((key) => {
      stats[key].avgRating = stats[key].count > 0
        ? stats[key].totalRating / stats[key].count
        : 0;
    });

    return Object.entries(stats).map(([brand, data]) => ({
      brand: brandLabels[brand as Brand] || brand,
      count: data.count,
      avgRating: Number(data.avgRating.toFixed(2)),
    }));
  }, [filteredProjects]);

  // 회차별 평균 점수 추이
  const roundTrend = useMemo(() => {
    const roundData: Record<number, { total: number; count: number }> = {};

    filteredProjects.forEach((p) => {
      if (!roundData[p.round]) {
        roundData[p.round] = { total: 0, count: 0 };
      }
      roundData[p.round].total += p.averageRating ?? 0;
      roundData[p.round].count++;
    });

    return Object.entries(roundData)
      .map(([round, data]) => ({
        round: `${round}차`,
        avgRating: Number((data.total / data.count).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => parseInt(a.round) - parseInt(b.round));
  }, [filteredProjects]);

  // 평점 분포
  const ratingDistribution = useMemo(() => {
    const distribution = [
      { range: '1점 미만', count: 0, projects: [] as SamplingProject[] },
      { range: '1-2점', count: 0, projects: [] as SamplingProject[] },
      { range: '2-3점', count: 0, projects: [] as SamplingProject[] },
      { range: '3-4점', count: 0, projects: [] as SamplingProject[] },
      { range: '4-5점', count: 0, projects: [] as SamplingProject[] },
    ];

    filteredProjects.forEach((p) => {
      const rating = p.averageRating ?? 0;
      if (rating < 1) {
        distribution[0].count++;
        distribution[0].projects.push(p);
      } else if (rating < 2) {
        distribution[1].count++;
        distribution[1].projects.push(p);
      } else if (rating < 3) {
        distribution[2].count++;
        distribution[2].projects.push(p);
      } else if (rating < 4) {
        distribution[3].count++;
        distribution[3].projects.push(p);
      } else {
        distribution[4].count++;
        distribution[4].projects.push(p);
      }
    });

    return distribution;
  }, [filteredProjects]);

  // 전체 통계 요약
  const summary = useMemo(() => {
    const total = filteredProjects.length;
    const avgRating = total > 0
      ? filteredProjects.reduce((sum, p) => sum + (p.averageRating ?? 0), 0) / total
      : 0;
    const highRated = filteredProjects.filter(p => (p.averageRating ?? 0) >= 4).length;
    const lowRated = filteredProjects.filter(p => (p.averageRating ?? 0) < 3).length;

    return { total, avgRating, highRated, lowRated };
  }, [filteredProjects]);

  // 최근 샘플링 목록
  const recentProjects = useMemo(() => {
    return [...filteredProjects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [filteredProjects]);

  const handleChartClick = (data: any, type: 'category' | 'manufacturer' | 'rating') => {
    if (!data || !data.projects || data.projects.length === 0) return;

    // 첫 번째 프로젝트로 이동
    const project = data.projects[0];
    navigate(`/sampling/${project.id}`);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/sampling/${projectId}`);
  };

  const categories: ProductCategory[] = ['크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'];
  const manufacturers: Manufacturer[] = ['콜마', '코스맥스', '기타'];

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="font-medium">필터</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | '')}
            className="select-field w-40"
          >
            <option value="">모든 카테고리</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value as Brand | '')}
            className="select-field w-40"
          >
            <option value="">모든 브랜드</option>
            {Object.entries(brandLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={selectedManufacturer}
            onChange={(e) => setSelectedManufacturer(e.target.value as Manufacturer | '')}
            className="select-field w-40"
          >
            <option value="">모든 제조사</option>
            {manufacturers.map((mfr) => (
              <option key={mfr} value={mfr}>{mfr}</option>
            ))}
          </select>

          {(selectedCategory || selectedBrand || selectedManufacturer) && (
            <>
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setSelectedManufacturer('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                필터 초기화
              </button>
              <button
                onClick={() => setShowEmailGenerator(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                AI 종합 이메일 ({filteredProjects.length}개 통합)
              </button>
            </>
          )}

          {/* 메신저 알림 버튼 */}
          <button
            onClick={handleSendNotification}
            disabled={sendingNotification || filteredProjects.length === 0}
            className="btn-secondary flex items-center gap-2 ml-auto"
          >
            {sendingNotification ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                전송중...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                메신저 알림
              </>
            )}
          </button>
        </div>
      </Card>

      {/* 종합 이메일 생성기 */}
      <CombinedEmailGenerator
        projects={filteredProjects}
        isOpen={showEmailGenerator}
        onClose={() => setShowEmailGenerator(false)}
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 샘플</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}개</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">평균 평점</p>
              <p className="text-2xl font-bold text-gray-900">{summary.avgRating.toFixed(2)}점</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">고평점 (4점↑)</p>
              <p className="text-2xl font-bold text-gray-900">{summary.highRated}개</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <Factory className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">저평점 (3점↓)</p>
              <p className="text-2xl font-bold text-gray-900">{summary.lowRated}개</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 샘플 수 & 평점 */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">카테고리별 현황</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryStats} onClick={(e: any) => e?.activePayload && handleChartClick(e.activePayload[0]?.payload, 'category')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'count' ? `${value}개` : `${value}점`,
                  name === 'count' ? '샘플 수' : '평균 평점'
                ]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="count" name="샘플 수" fill="#6366f1" radius={[4, 4, 0, 0]} cursor="pointer" />
              <Bar yAxisId="right" dataKey="avgRating" name="평균 평점" fill="#22c55e" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 제조사별 분포 */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">제조사별 현황</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={manufacturerStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: any) => `${name} (${value}개)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="manufacturer"
                onClick={(data: any) => handleChartClick(data, 'manufacturer')}
                cursor="pointer"
              >
                {manufacturerStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}개`, '샘플 수']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 회차별 평점 추이 */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">회차별 평점 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roundTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="round" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}점`, '평균 평점']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgRating"
                name="평균 평점"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 평점 분포 */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">평점 분포</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingDistribution} onClick={(e: any) => e?.activePayload && handleChartClick(e.activePayload[0]?.payload, 'rating')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}개`, '샘플 수']} />
              <Bar dataKey="count" name="샘플 수" radius={[4, 4, 0, 0]} cursor="pointer">
                {ratingDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index < 2 ? '#f43f5e' : index < 3 ? '#f97316' : index < 4 ? '#eab308' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 브랜드별 비교 */}
      {brandStats.length > 1 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">브랜드별 비교</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={brandStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis dataKey="brand" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'count' ? `${value}개` : `${value}점`,
                  name === 'count' ? '샘플 수' : '평균 평점'
                ]}
              />
              <Legend />
              <Bar dataKey="count" name="샘플 수" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="avgRating" name="평균 평점" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 최근 샘플링 목록 */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">최근 샘플링</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">제품명</th>
                <th className="table-header">브랜드</th>
                <th className="table-header">카테고리</th>
                <th className="table-header">제조사</th>
                <th className="table-header">회차</th>
                <th className="table-header">샘플코드</th>
                <th className="table-header">평점</th>
                <th className="table-header">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <td className="table-cell font-medium text-gray-900">{project.title}</td>
                  <td className="table-cell text-gray-600">{brandLabels[project.brand]}</td>
                  <td className="table-cell">
                    <span
                      className="inline-flex items-center rounded-full font-medium px-3 py-1 text-xs"
                      style={{ backgroundColor: `${categoryColors[project.category]}20`, color: categoryColors[project.category] }}
                    >
                      {project.category}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">{project.manufacturer}</td>
                  <td className="table-cell text-gray-600">{project.round}차</td>
                  <td className="table-cell text-gray-500 font-mono text-sm">{project.sampleCode || '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{project.averageRating?.toFixed(1) || '-'}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
