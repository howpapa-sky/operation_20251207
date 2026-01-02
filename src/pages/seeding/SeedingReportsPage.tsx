import { useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Eye, Heart } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';

export default function SeedingReportsPage() {
  const { projects, influencers, isLoading, fetchProjects, fetchInfluencers, getOverallStats } = useSeedingStore();

  useEffect(() => {
    fetchProjects();
    fetchInfluencers();
  }, [fetchProjects, fetchInfluencers]);

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">성과 리포트</h1>
            <p className="text-sm text-gray-500">인플루언서 시딩 성과 분석</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_seedings}</div>
              <div className="text-sm text-gray-500">총 시딩</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">{stats.acceptance_rate.toFixed(1)}%</span>
            <span className="text-gray-400">수락률</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(stats.total_cost / 10000).toFixed(0)}만원
              </div>
              <div className="text-sm text-gray-500">총 시딩 원가</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-600">{(stats.total_fee / 10000).toFixed(0)}만원</span>
            <span className="text-gray-400">원고비</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.total_reach >= 10000
                  ? `${(stats.total_reach / 10000).toFixed(1)}만`
                  : stats.total_reach.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">총 도달</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-600">{stats.posting_rate.toFixed(1)}%</span>
            <span className="text-gray-400">포스팅률</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.total_engagement >= 10000
                  ? `${(stats.total_engagement / 10000).toFixed(1)}만`
                  : stats.total_engagement.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">총 참여</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-gray-400">좋아요+댓글+저장</span>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">상태별 현황</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${stats.total_seedings > 0 ? (count / stats.total_seedings) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">유형별 분포</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">시딩 유형</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{stats.by_type.free}</div>
                    <div className="text-sm text-green-700">무가</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{stats.by_type.paid}</div>
                    <div className="text-sm text-blue-700">유가</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">콘텐츠 유형</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">{stats.by_content.story}</div>
                    <div className="text-xs text-gray-500">스토리</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">{stats.by_content.reels}</div>
                    <div className="text-xs text-gray-500">릴스</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">{stats.by_content.feed}</div>
                    <div className="text-xs text-gray-500">피드</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">{stats.by_content.both}</div>
                    <div className="text-xs text-gray-500">복합</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projects Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">프로젝트별 요약</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            아직 프로젝트가 없습니다.
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {projects.length}개 프로젝트 (상세 차트 준비 중)
          </div>
        )}
      </div>
    </div>
  );
}
