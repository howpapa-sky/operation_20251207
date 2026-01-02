import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Hash,
  AtSign,
  CheckCircle2,
  XCircle,
  Sparkles,
  Link2,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProductGuide, contentTypeLabels, Brand, ContentType } from '../../types';

export default function ProductGuidePublicPage() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<ProductGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuide() {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from('product_guides')
          .select('*')
          .eq('public_slug', slug)
          .eq('is_public', true)
          .single();

        if (error) throw error;

        setGuide({
          id: data.id,
          product_id: data.product_id ?? undefined,
          product_name: data.product_name,
          brand: data.brand as Brand,
          content_type: data.content_type as ContentType,
          description: data.description || '',
          key_points: data.key_points || [],
          hashtags: data.hashtags || [],
          mentions: data.mentions || [],
          dos: data.dos || [],
          donts: data.donts || [],
          link_url: data.link_url ?? undefined,
          image_urls: data.image_urls || [],
          reference_urls: data.reference_urls || [],
          public_slug: data.public_slug ?? '',
          is_public: data.is_public,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } catch (err: any) {
        setError('가이드를 찾을 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuide();
  }, [slug]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">가이드를 찾을 수 없습니다</h1>
          <p className="text-gray-500">링크가 만료되었거나 비공개 상태입니다.</p>
        </div>
      </div>
    );
  }

  const brandConfig = {
    howpapa: {
      name: 'HOWPAPA',
      emoji: '🧡',
      bgGradient: 'from-orange-400 to-orange-600',
      lightBg: 'bg-orange-50',
      accentColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    nuccio: {
      name: 'NUCCIO',
      emoji: '💚',
      bgGradient: 'from-green-400 to-green-600',
      lightBg: 'bg-green-50',
      accentColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
  };

  const config = brandConfig[guide.brand];
  const contentType = contentTypeLabels[guide.content_type];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.bgGradient} py-10 px-4`}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium mb-4">
            <span className="text-lg">{config.emoji}</span>
            {config.name}
          </div>
          <h1 className="text-3xl font-bold mb-2">{guide.product_name}</h1>
          <p className="text-white/80">시딩 가이드</p>
          <div className="mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {contentType}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Product Images */}
        {guide.image_urls && guide.image_urls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                제품 이미지
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {guide.image_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`${guide.product_name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {guide.description && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-lg">📝</span>
                제품 소개
              </h2>
            </div>
            <div className="p-4">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{guide.description}</p>
            </div>
          </div>
        )}

        {/* Key Points */}
        {guide.key_points && guide.key_points.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                핵심 포인트
              </h2>
            </div>
            <div className="p-4">
              <ul className="space-y-3">
                {guide.key_points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 pt-0.5">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {guide.hashtags && guide.hashtags.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-500" />
                필수 해시태그
              </h2>
              <button
                onClick={() => handleCopy(guide.hashtags.map((h) => `#${h.replace('#', '')}`).join(' '), 'hashtags')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied === 'hashtags'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {copied === 'hashtags' ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    복사하기
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {guide.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    #{tag.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mentions */}
        {guide.mentions && guide.mentions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <AtSign className="w-5 h-5 text-purple-500" />
                필수 멘션
              </h2>
              <button
                onClick={() => handleCopy(guide.mentions.join(' '), 'mentions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied === 'mentions'
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                }`}
              >
                {copied === 'mentions' ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    복사하기
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {guide.mentions.map((mention, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium"
                  >
                    {mention.startsWith('@') ? mention : `@${mention}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Story Link */}
        {guide.link_url && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-gray-500" />
                스토리 링크
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={guide.link_url}
                  readOnly
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
                />
                <button
                  onClick={() => handleCopy(guide.link_url || '', 'link')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    copied === 'link'
                      ? 'bg-green-500 text-white'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {copied === 'link' ? (
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
            </div>
          </div>
        )}

        {/* DO's and DON'Ts */}
        {(guide.dos.length > 0 || guide.donts.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DO's */}
            {guide.dos.length > 0 && (
              <div className="bg-green-50 rounded-2xl border border-green-100 overflow-hidden">
                <div className="p-4 border-b border-green-100">
                  <h2 className="font-bold text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    꼭 포함해주세요
                  </h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-2.5">
                    {guide.dos.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-green-800">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* DON'Ts */}
            {guide.donts.length > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
                <div className="p-4 border-b border-red-100">
                  <h2 className="font-bold text-red-800 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    주의해주세요
                  </h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-2.5">
                    {guide.donts.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-red-800">
                        <span className="text-red-500 mt-0.5">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reference URLs */}
        {guide.reference_urls && guide.reference_urls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-gray-500" />
                참고 콘텐츠
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {guide.reference_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-sm text-primary-600 hover:bg-gray-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-10 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.lightBg} ${config.accentColor}`}>
          <span className="text-lg">{config.emoji}</span>
          <span className="font-medium">{config.name} Influencer Guide</span>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          문의가 필요하시면 담당 매니저에게 연락해주세요
        </p>
      </div>
    </div>
  );
}
