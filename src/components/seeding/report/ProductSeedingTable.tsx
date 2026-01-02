import { Package } from 'lucide-react';
import { SeedingProject, SeedingInfluencer } from '../../../types';

interface ProductSeedingData {
  productName: string;
  projectId: string;
  totalSeedings: number;
  completedSeedings: number;
  postingRate: number;
  totalReach: number;
  totalCost: number;
  cpm: number;
}

interface ProductSeedingTableProps {
  projects: SeedingProject[];
  influencers: SeedingInfluencer[];
  isLoading?: boolean;
}

// 숫자 포맷팅
function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// 금액 포맷팅
function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₩${(amount / 10000000).toFixed(1)}천만`;
  }
  if (amount >= 10000) {
    return `₩${(amount / 10000).toFixed(0)}만`;
  }
  return `₩${amount.toLocaleString()}`;
}

export default function ProductSeedingTable({
  projects,
  influencers,
  isLoading,
}: ProductSeedingTableProps) {
  // 프로젝트별 통계 계산
  const productData: ProductSeedingData[] = projects
    .map((project) => {
      const projectInfluencers = influencers.filter((i) => i.project_id === project.id);
      const completedInfluencers = projectInfluencers.filter(
        (i) => i.status === 'posted' || i.status === 'completed'
      );

      const totalSeedings = projectInfluencers.length;
      const completedSeedings = completedInfluencers.length;
      const postingRate = totalSeedings > 0 ? (completedSeedings / totalSeedings) * 100 : 0;

      // 성과 합산
      let totalReach = 0;
      let totalFee = 0;
      projectInfluencers.forEach((inf) => {
        if (inf.performance) {
          totalReach += (inf.performance.views || 0) + (inf.performance.story_views || 0);
        }
        totalFee += inf.fee || 0;
      });

      // 비용 계산 (원가 × 수량 + 원고비)
      const totalQuantity = projectInfluencers.reduce(
        (sum, inf) => sum + (inf.shipping?.quantity || 1),
        0
      );
      const totalCost = totalQuantity * project.cost_price + totalFee;

      // CPM 계산
      const cpm = totalReach > 0 ? (totalCost / totalReach) * 1000 : 0;

      return {
        productName: project.product_name || project.name,
        projectId: project.id,
        totalSeedings,
        completedSeedings,
        postingRate,
        totalReach,
        totalCost,
        cpm,
      };
    })
    .filter((data) => data.totalSeedings > 0)
    .sort((a, b) => b.totalSeedings - a.totalSeedings);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">📦 제품별 시딩 현황</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (productData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">📦 제품별 시딩 현황</h3>
        </div>
        <div className="text-center py-12 text-gray-400">
          시딩 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Package className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">📦 제품별 시딩 현황</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-2 font-medium text-gray-500">제품명</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">시딩수</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">완료</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">포스팅률</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">총 도달</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">비용합계</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">CPM</th>
            </tr>
          </thead>
          <tbody>
            {productData.map((data) => (
              <tr key={data.projectId} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <span className="font-medium text-gray-900">{data.productName}</span>
                </td>
                <td className="py-3 px-2 text-right text-gray-700">{data.totalSeedings}</td>
                <td className="py-3 px-2 text-right text-gray-700">{data.completedSeedings}</td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          data.postingRate >= 80
                            ? 'bg-green-500'
                            : data.postingRate >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(data.postingRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-700 w-12 text-right">
                      {data.postingRate.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-medium text-gray-900">
                  {formatNumber(data.totalReach)}
                </td>
                <td className="py-3 px-2 text-right text-gray-700">
                  {formatCurrency(data.totalCost)}
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`font-medium ${
                      data.cpm <= 1500
                        ? 'text-green-600'
                        : data.cpm <= 3000
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {data.totalReach > 0 ? formatCurrency(Math.round(data.cpm)) : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">총 시딩</div>
            <div className="text-lg font-bold text-gray-900">
              {productData.reduce((sum, d) => sum + d.totalSeedings, 0)}건
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">총 완료</div>
            <div className="text-lg font-bold text-gray-900">
              {productData.reduce((sum, d) => sum + d.completedSeedings, 0)}건
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">총 도달</div>
            <div className="text-lg font-bold text-gray-900">
              {formatNumber(productData.reduce((sum, d) => sum + d.totalReach, 0))}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">총 비용</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(productData.reduce((sum, d) => sum + d.totalCost, 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
