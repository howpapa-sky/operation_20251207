import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Plus,
  X,
  Trash2,
  Link2,
  Copy,
  Check,
  Hash,
  AtSign,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { Brand, ContentType, ProductGuide, contentTypeLabels } from '../../types';

interface FormData {
  product_id?: string;
  product_name: string;
  brand: Brand;
  content_type: ContentType;
  description: string;
  key_points: string[];
  hashtags: string[];
  mentions: string[];
  dos: string[];
  donts: string[];
  link_url: string;
  image_urls: string[];
  reference_urls: string[];
  is_public: boolean;
  public_slug: string;
}

const defaultFormData: FormData = {
  product_name: '',
  brand: 'howpapa',
  content_type: 'both',
  description: '',
  key_points: [],
  hashtags: [],
  mentions: ['@howpapa_official'],
  dos: [],
  donts: [],
  link_url: '',
  image_urls: [],
  reference_urls: [],
  is_public: false,
  public_slug: '',
};

interface ListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  icon?: React.ReactNode;
  tagStyle?: 'default' | 'hashtag' | 'mention';
}

function ListInput({ items, onChange, placeholder, icon, tagStyle = 'default' }: ListInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...items, inputValue.trim()]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const getTagClass = () => {
    switch (tagStyle) {
      case 'hashtag':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'mention':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm border ${getTagClass()}`}
            >
              {tagStyle === 'hashtag' && '#'}
              {tagStyle === 'mention' && !item.startsWith('@') && '@'}
              {item.replace(/^[#@]/, '')}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500`}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface BulletListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  bulletColor?: string;
}

function BulletListInput({ items, onChange, placeholder, bulletColor = 'text-gray-400' }: BulletListInputProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <span className={bulletColor}>•</span>
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-gray-300">•</span>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}

export default function ProductGuideEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id && id !== 'new';

  const { guides, addGuide, updateGuide, fetchGuides, isLoading } = useSeedingStore();

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load guides if not loaded
  useEffect(() => {
    if (guides.length === 0) {
      fetchGuides();
    }
  }, [guides.length, fetchGuides]);

  // Load existing guide
  useEffect(() => {
    if (isEditing && id) {
      const guide = guides.find((g) => g.id === id);
      if (guide) {
        setFormData({
          product_id: guide.product_id,
          product_name: guide.product_name,
          brand: guide.brand,
          content_type: guide.content_type,
          description: guide.description || '',
          key_points: guide.key_points || [],
          hashtags: guide.hashtags || [],
          mentions: guide.mentions || [],
          dos: guide.dos || [],
          donts: guide.donts || [],
          link_url: guide.link_url || '',
          image_urls: guide.image_urls || [],
          reference_urls: guide.reference_urls || [],
          is_public: guide.is_public,
          public_slug: guide.public_slug,
        });
      }
    } else if (!isEditing) {
      // Generate slug for new guide
      const slug = `guide-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      setFormData((prev) => ({ ...prev, public_slug: slug }));
    }
  }, [isEditing, id, guides]);

  // Update default mention when brand changes
  useEffect(() => {
    if (!isEditing) {
      const mention = formData.brand === 'howpapa' ? '@howpapa_official' : '@nucio_official';
      const hasOfficialMention = formData.mentions.some((m) => m.includes('_official'));
      if (!hasOfficialMention) {
        setFormData((prev) => ({
          ...prev,
          mentions: [mention, ...prev.mentions],
        }));
      }
    }
  }, [formData.brand, isEditing]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!formData.product_name.trim()) {
      showToastMessage('제품명을 입력하세요.');
      return;
    }

    setIsSaving(true);
    try {
      const guideData = {
        product_id: formData.product_id,
        product_name: formData.product_name.trim(),
        brand: formData.brand,
        content_type: formData.content_type,
        description: formData.description.trim(),
        key_points: formData.key_points.filter((p) => p.trim()),
        hashtags: formData.hashtags.filter((h) => h.trim()),
        mentions: formData.mentions.filter((m) => m.trim()),
        dos: formData.dos.filter((d) => d.trim()),
        donts: formData.donts.filter((d) => d.trim()),
        link_url: formData.link_url.trim(),
        image_urls: formData.image_urls,
        reference_urls: formData.reference_urls.filter((r) => r.trim()),
        is_public: formData.is_public,
        public_slug: formData.public_slug,
      };

      if (isEditing && id) {
        await updateGuide(id, guideData);
        showToastMessage('가이드가 수정되었습니다.');
      } else {
        await addGuide(guideData);
        showToastMessage('가이드가 생성되었습니다.');
        setTimeout(() => navigate('/seeding/guides'), 500);
      }
    } catch (error) {
      console.error('Failed to save guide:', error);
      showToastMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/g/${formData.public_slug}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleCopyHashtags = async () => {
    const text = formData.hashtags.map((tag) => `#${tag.replace('#', '')}`).join(' ');
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage('해시태그가 복사되었습니다.');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const publicUrl = `${window.location.origin}/g/${formData.public_slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/seeding/guides')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? '가이드 수정' : '새 가이드'}
              </h1>
              <p className="text-sm text-gray-500">인플루언서에게 전달할 제품 가이드 작성</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {formData.is_public && (
            <button
              onClick={() => window.open(publicUrl, '_blank')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              미리보기
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">기본 정보</h2>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="예: 리프팅 크림"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">브랜드</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, brand: 'howpapa' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  formData.brand === 'howpapa'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">🧡</span>
                하우파파
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, brand: 'nuccio' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  formData.brand === 'nuccio'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">💚</span>
                누씨오
              </button>
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">콘텐츠 유형</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(contentTypeLabels) as [ContentType, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, content_type: value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.content_type === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Story Link */}
          {(formData.content_type === 'story' || formData.content_type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                스토리 링크
              </label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://link.howpapa.com/..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <h2 className="font-semibold text-gray-900">제품 설명</h2>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="제품의 특징과 효능을 설명해주세요..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
          />
        </div>

        {/* Key Points */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">핵심 포인트</h2>
          </div>
          <BulletListInput
            items={formData.key_points}
            onChange={(items) => setFormData({ ...formData, key_points: items })}
            placeholder="핵심 포인트 입력..."
            bulletColor="text-amber-500"
          />
        </div>

        {/* Hashtags */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-gray-900">필수 해시태그</h2>
            </div>
            {formData.hashtags.length > 0 && (
              <button
                type="button"
                onClick={handleCopyHashtags}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600"
              >
                <Copy className="w-4 h-4" />
                전체복사
              </button>
            )}
          </div>
          <ListInput
            items={formData.hashtags}
            onChange={(items) => setFormData({ ...formData, hashtags: items })}
            placeholder="#해시태그 입력 (Enter로 추가)"
            icon={<Hash className="w-4 h-4" />}
            tagStyle="hashtag"
          />
        </div>

        {/* Mentions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AtSign className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900">필수 멘션</h2>
          </div>
          <ListInput
            items={formData.mentions}
            onChange={(items) => setFormData({ ...formData, mentions: items })}
            placeholder="@계정 입력 (Enter로 추가)"
            icon={<AtSign className="w-4 h-4" />}
            tagStyle="mention"
          />
        </div>

        {/* Do's */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-gray-900">DO's (꼭 해주세요)</h2>
          </div>
          <BulletListInput
            items={formData.dos}
            onChange={(items) => setFormData({ ...formData, dos: items })}
            placeholder="꼭 해주셔야 할 내용 입력..."
            bulletColor="text-green-500"
          />
        </div>

        {/* Don'ts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-900">DON'Ts (주의해주세요)</h2>
          </div>
          <BulletListInput
            items={formData.donts}
            onChange={(items) => setFormData({ ...formData, donts: items })}
            placeholder="주의사항 입력..."
            bulletColor="text-red-500"
          />
        </div>

        {/* Reference URLs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">참고 콘텐츠 URL</h2>
          </div>
          <ListInput
            items={formData.reference_urls}
            onChange={(items) => setFormData({ ...formData, reference_urls: items })}
            placeholder="참고할 콘텐츠 URL 입력..."
            icon={<Link2 className="w-4 h-4" />}
          />
        </div>

        {/* Public Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">공개 설정</h2>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">공개 링크 활성화</span>
          </label>

          {formData.is_public && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <input
                type="text"
                value={publicUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    복사
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

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
