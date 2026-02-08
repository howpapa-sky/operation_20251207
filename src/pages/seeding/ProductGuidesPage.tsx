import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Check, Search, X } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { Brand } from '../../types';
import ProductGuideCard from '../../components/seeding/ProductGuideCard';

type BrandFilter = Brand | 'all';

const brandTabs: { value: BrandFilter; label: string; emoji?: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'howpapa', label: '하우파파', emoji: '🧡' },
  { value: 'nuccio', label: '누씨오', emoji: '💚' },
];

export default function ProductGuidesPage() {
  const navigate = useNavigate();
  const { guides, isLoading, fetchGuides, deleteGuide } = useSeedingStore();

  // Filter states
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  // Filtered guides
  const filteredGuides = useMemo(() => {
    let result = guides;

    // Brand filter
    if (brandFilter !== 'all') {
      result = result.filter((guide) => guide.brand === brandFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (guide) =>
          guide.product_name.toLowerCase().includes(query) ||
          guide.description?.toLowerCase().includes(query) ||
          guide.hashtags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [guides, brandFilter, searchQuery]);

  // Count by brand
  const brandCounts = useMemo(() => {
    return {
      all: guides.length,
      howpapa: guides.filter((g) => g.brand === 'howpapa').length,
      nucio: guides.filter((g) => g.brand === 'nuccio').length,
    };
  }, [guides]);

  // Handlers
  const handleDelete = async (id: string) => {
    try {
      await deleteGuide(id);
      showToastMessage('가이드가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete guide:', error);
    }
  };

  const handleCopyLink = async (guide: { public_slug: string; product_name: string }) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/g/${guide.public_slug}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      showToastMessage(`"${guide.product_name}" 링크가 복사되었습니다.`);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

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
          새 가이드
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Brand Tabs */}
          <div className="flex gap-2">
            {brandTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setBrandFilter(tab.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  brandFilter === tab.value
                    ? tab.value === 'howpapa'
                      ? 'bg-orange-500 text-white'
                      : tab.value === 'nuccio'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.emoji && <span>{tab.emoji}</span>}
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    brandFilter === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {brandCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제품명, 해시태그 검색..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            {searchQuery || brandFilter !== 'all' ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-gray-500 mb-4">다른 조건으로 검색해보세요.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBrandFilter('all');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">가이드가 없습니다</h3>
                <p className="text-gray-500 mb-4">인플루언서에게 전달할 제품 가이드를 만들어보세요.</p>
                <button
                  onClick={() => navigate('/seeding/guides/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  가이드 만들기
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGuides.map((guide) => (
            <ProductGuideCard
              key={guide.id}
              guide={guide}
              onDelete={handleDelete}
              onCopyLink={handleCopyLink}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-xl">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
