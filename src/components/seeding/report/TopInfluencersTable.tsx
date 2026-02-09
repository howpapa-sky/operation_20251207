import { Trophy, ExternalLink } from 'lucide-react';
import { SeedingInfluencer, contentTypeLabels } from '../../../types';

interface TopInfluencer {
  rank: number;
  accountId: string;
  accountName?: string;
  platform: string;
  followerCount: number;
  contentType: string;
  views: number;
  engagement: number;
  engagementRate: number;
  postingUrl?: string;
}

interface TopInfluencersTableProps {
  influencers: SeedingInfluencer[];
  isLoading?: boolean;
  limit?: number;
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

export default function TopInfluencersTable({
  influencers,
  isLoading,
  limit = 10,
}: TopInfluencersTableProps) {
  // 완료된 인플루언서를 조회수 순(없으면 팔로워순)으로 정렬
  // (이미 completed_at 기준으로 필터링된 데이터를 받음)
  const topInfluencers: TopInfluencer[] = influencers
    .map((inf) => {
      const views = (inf.performance?.views || 0) + (inf.performance?.story_views || 0);
      const engagement =
        (inf.performance?.likes || 0) +
        (inf.performance?.comments || 0) +
        (inf.performance?.saves || 0) +
        (inf.performance?.shares || 0);
      const engagementRate = views > 0 ? (engagement / views) * 100 : 0;

      return {
        rank: 0,
        accountId: inf.account_id,
        accountName: inf.account_name,
        platform: inf.platform,
        followerCount: inf.follower_count,
        contentType: contentTypeLabels[inf.content_type],
        views,
        engagement,
        engagementRate,
        postingUrl: inf.posting_url,
      };
    })
    .sort((a, b) => b.views - a.views || b.followerCount - a.followerCount)
    .slice(0, limit)
    .map((inf, index) => ({ ...inf, rank: index + 1 }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-gray-900">🏆 TOP {limit} 인플루언서</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (topInfluencers.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-gray-900">🏆 TOP {limit} 인플루언서</h3>
        </div>
        <div className="text-center py-12 text-gray-400">
          포스팅 완료된 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-900">🏆 TOP {limit} 인플루언서</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-2 font-medium text-gray-500 w-12">순위</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">인플루언서</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">팔로워</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">콘텐츠</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">조회수</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">참여수</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">참여율</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {topInfluencers.map((inf) => (
              <tr key={inf.accountId} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      inf.rank === 1
                        ? 'bg-amber-100 text-amber-700'
                        : inf.rank === 2
                        ? 'bg-gray-200 text-gray-700'
                        : inf.rank === 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {inf.rank}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      @{inf.accountId.replace('@', '')}
                    </div>
                    {inf.accountName && (
                      <div className="text-xs text-gray-500">{inf.accountName}</div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-right text-gray-700">
                  {formatNumber(inf.followerCount)}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {inf.contentType}
                  </span>
                </td>
                <td className="py-3 px-2 text-right font-medium text-gray-900">
                  {formatNumber(inf.views)}
                </td>
                <td className="py-3 px-2 text-right text-gray-700">
                  {formatNumber(inf.engagement)}
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`font-medium ${
                      inf.engagementRate >= 5
                        ? 'text-green-600'
                        : inf.engagementRate >= 3
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {inf.engagementRate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  {inf.postingUrl && (
                    <a
                      href={inf.postingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
