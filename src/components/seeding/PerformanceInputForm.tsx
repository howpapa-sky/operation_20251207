import { useState, useEffect } from 'react';
import { Eye, Heart, MessageCircle, Bookmark, Share2, MousePointer, Save, Loader2 } from 'lucide-react';
import { SeedingPerformance } from '../../types';

interface PerformanceInputFormProps {
  performance: SeedingPerformance;
  onSave: (performance: SeedingPerformance) => Promise<void>;
  isSaving?: boolean;
}

export default function PerformanceInputForm({
  performance,
  onSave,
  isSaving = false,
}: PerformanceInputFormProps) {
  const [formData, setFormData] = useState<SeedingPerformance>({
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    story_views: 0,
    link_clicks: 0,
    ...performance,
  });

  useEffect(() => {
    setFormData({
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      story_views: 0,
      link_clicks: 0,
      ...performance,
    });
  }, [performance]);

  const handleChange = (field: keyof SeedingPerformance, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      measured_at: new Date().toISOString(),
    });
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // 총 참여 수 계산
  const totalEngagement = (formData.likes ?? 0) + (formData.comments ?? 0) + (formData.saves ?? 0) + (formData.shares ?? 0);

  // 참여율 계산
  const engagementRate = formData.views && formData.views > 0
    ? ((totalEngagement / formData.views) * 100).toFixed(2)
    : '0.00';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <div className="text-xs text-blue-600 font-medium mb-1">총 조회수</div>
          <div className="text-2xl font-bold text-blue-900">{formatNumber(formData.views ?? 0)}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl">
          <div className="text-xs text-pink-600 font-medium mb-1">참여율</div>
          <div className="text-2xl font-bold text-pink-900">{engagementRate}%</div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">성과 지표 입력</h3>

        {/* Views */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">조회수</label>
            <input
              type="number"
              min={0}
              value={formData.views || ''}
              onChange={(e) => handleChange('views', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Story Views (optional) */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">스토리 조회수</label>
            <input
              type="number"
              min={0}
              value={formData.story_views || ''}
              onChange={(e) => handleChange('story_views', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Engagement Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Likes */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
              <Heart className="w-4 h-4 text-pink-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">좋아요</label>
              <input
                type="number"
                min={0}
                value={formData.likes || ''}
                onChange={(e) => handleChange('likes', Number(e.target.value))}
                placeholder="0"
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-sm"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">댓글</label>
              <input
                type="number"
                min={0}
                value={formData.comments || ''}
                onChange={(e) => handleChange('comments', Number(e.target.value))}
                placeholder="0"
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-sm"
              />
            </div>
          </div>

          {/* Saves */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">저장</label>
              <input
                type="number"
                min={0}
                value={formData.saves || ''}
                onChange={(e) => handleChange('saves', Number(e.target.value))}
                placeholder="0"
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-sm"
              />
            </div>
          </div>

          {/* Shares */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">공유</label>
              <input
                type="number"
                min={0}
                value={formData.shares || ''}
                onChange={(e) => handleChange('shares', Number(e.target.value))}
                placeholder="0"
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Link Clicks */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <MousePointer className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">링크 클릭수</label>
            <input
              type="number"
              min={0}
              value={formData.link_clicks || ''}
              onChange={(e) => handleChange('link_clicks', Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Total Engagement Summary */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="text-xs text-gray-500 mb-2">총 참여 수</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{formatNumber(totalEngagement)}</span>
          <span className="text-sm text-gray-500">
            (좋아요 {formData.likes ?? 0} + 댓글 {formData.comments ?? 0} + 저장 {formData.saves ?? 0} + 공유 {formData.shares ?? 0})
          </span>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            성과 저장
          </>
        )}
      </button>

      {/* Last Updated */}
      {performance.measured_at && (
        <p className="text-xs text-gray-400 text-center">
          마지막 업데이트:{' '}
          {new Date(performance.measured_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </form>
  );
}
