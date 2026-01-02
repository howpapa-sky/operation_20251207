import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Save, Link as LinkIcon } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { ProductGuide, Brand, ContentType } from '../../types';

export default function ProductGuideEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { guides, addGuide, updateGuide, generateGuideLink, fetchGuides, isLoading } = useSeedingStore();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<Partial<ProductGuide>>({
    product_name: '',
    brand: 'howpapa',
    content_type: 'both',
    description: '',
    key_points: [],
    hashtags: [],
    mentions: [],
    dos: [],
    donts: [],
    link_url: '',
    image_urls: [],
    reference_urls: [],
    is_public: false,
  });

  useEffect(() => {
    if (guides.length === 0) {
      fetchGuides();
    }
  }, [guides.length, fetchGuides]);

  useEffect(() => {
    if (isEdit && id) {
      const guide = guides.find((g) => g.id === id);
      if (guide) {
        setFormData(guide);
      }
    }
  }, [isEdit, id, guides]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && id) {
        await updateGuide(id, formData);
      } else {
        await addGuide(formData as Omit<ProductGuide, 'id' | 'created_at' | 'updated_at'>);
      }
      navigate('/seeding/guides');
    } catch (error) {
      console.error('Failed to save guide:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (id) {
      const link = await generateGuideLink(id);
      alert(`공개 링크: ${window.location.origin}${link}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/seeding/guides')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? '가이드 수정' : '새 가이드'}
            </h1>
            <p className="text-sm text-gray-500">
              인플루언서에게 전달할 콘텐츠 가이드
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              onClick={handleGenerateLink}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              공개 링크 생성
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품명 *
              </label>
              <input
                type="text"
                value={formData.product_name || ''}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  브랜드 *
                </label>
                <select
                  value={formData.brand || 'howpapa'}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value as Brand })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="howpapa">하우파파</option>
                  <option value="nuccio">누씨오</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  콘텐츠 유형 *
                </label>
                <select
                  value={formData.content_type || 'both'}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as ContentType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="story">스토리</option>
                  <option value="reels">릴스</option>
                  <option value="feed">피드</option>
                  <option value="both">스토리+릴스</option>
                </select>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가이드 설명
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="제품에 대한 간단한 설명과 콘텐츠 방향성을 입력하세요."
            />
          </div>

          {/* 스토리용 링크 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스토리용 링크 URL
            </label>
            <input
              type="url"
              value={formData.link_url || ''}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://..."
            />
          </div>

          <div className="text-center py-8 text-gray-500">
            (핵심 포인트, 해시태그, 멘션, DO/DON'T 입력 UI 준비 중)
          </div>
        </form>
      </div>
    </div>
  );
}
