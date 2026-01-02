import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ExternalLink, Edit2 } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';

export default function ProductGuidesPage() {
  const navigate = useNavigate();
  const { guides, isLoading, fetchGuides } = useSeedingStore();

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">제품 가이드</h1>
            <p className="text-sm text-gray-500">인플루언서용 콘텐츠 가이드 관리</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/seeding/guides/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          가이드 추가
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">가이드가 없습니다</h3>
            <p className="text-gray-500 mb-4">인플루언서에게 전달할 제품 가이드를 만들어보세요.</p>
            <button
              onClick={() => navigate('/seeding/guides/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              가이드 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <div
                key={guide.id}
                className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{guide.product_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      guide.brand === 'howpapa'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {guide.brand === 'howpapa' ? '하우파파' : '누씨오'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/seeding/guides/${guide.id}/edit`)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {guide.is_public && (
                      <a
                        href={`/g/${guide.public_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="공개 페이지 열기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{guide.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {guide.content_type === 'story' && '스토리'}
                    {guide.content_type === 'reels' && '릴스'}
                    {guide.content_type === 'feed' && '피드'}
                    {guide.content_type === 'both' && '스토리+릴스'}
                  </span>
                  {guide.is_public && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">공개</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
