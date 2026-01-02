import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Copy, Check, ExternalLink, Hash, AtSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProductGuide } from '../../types';

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
          product_id: data.product_id,
          product_name: data.product_name,
          brand: data.brand,
          content_type: data.content_type,
          description: data.description || '',
          key_points: data.key_points || [],
          hashtags: data.hashtags || [],
          mentions: data.mentions || [],
          dos: data.dos || [],
          donts: data.donts || [],
          link_url: data.link_url,
          image_urls: data.image_urls || [],
          reference_urls: data.reference_urls || [],
          public_slug: data.public_slug,
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
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">가이드를 찾을 수 없습니다</h1>
          <p className="text-gray-500">링크가 만료되었거나 비공개 상태입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className={`py-8 ${guide.brand === 'howpapa' ? 'bg-orange-500' : 'bg-green-500'}`}>
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <p className="text-sm opacity-80 mb-2">
            {guide.brand === 'howpapa' ? 'HOWPAPA' : 'NUCCIO'} 제품 가이드
          </p>
          <h1 className="text-2xl font-bold">{guide.product_name}</h1>
          <p className="mt-2 opacity-90">
            {guide.content_type === 'story' && '스토리 콘텐츠'}
            {guide.content_type === 'reels' && '릴스 콘텐츠'}
            {guide.content_type === 'feed' && '피드 콘텐츠'}
            {guide.content_type === 'both' && '스토리 + 릴스'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 설명 */}
        {guide.description && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-3">제품 소개</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{guide.description}</p>
          </div>
        )}

        {/* 핵심 포인트 */}
        {guide.key_points.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-3">핵심 포인트</h2>
            <ul className="space-y-2">
              {guide.key_points.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {index + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 해시태그 */}
        {guide.hashtags.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                해시태그
              </h2>
              <button
                onClick={() => handleCopy(guide.hashtags.map((h) => `#${h}`).join(' '), 'hashtags')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {copied === 'hashtags' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                복사
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 멘션 */}
        {guide.mentions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AtSign className="w-5 h-5" />
                필수 멘션
              </h2>
              <button
                onClick={() => handleCopy(guide.mentions.join(' '), 'mentions')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {copied === 'mentions' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                복사
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.mentions.map((mention, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {mention}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 스토리 링크 */}
        {guide.link_url && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              스토리 링크
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={guide.link_url}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={() => handleCopy(guide.link_url || '', 'link')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied === 'link'
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {copied === 'link' ? '복사됨!' : '복사'}
              </button>
            </div>
          </div>
        )}

        {/* DO / DON'T */}
        {(guide.dos.length > 0 || guide.donts.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guide.dos.length > 0 && (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                <h2 className="text-lg font-bold text-green-700 mb-3">DO</h2>
                <ul className="space-y-2">
                  {guide.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-green-700">
                      <span>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guide.donts.length > 0 && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <h2 className="text-lg font-bold text-red-700 mb-3">DON'T</h2>
                <ul className="space-y-2">
                  {guide.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-red-700">
                      <span>✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-sm text-gray-400">
        {guide.brand === 'howpapa' ? 'HOWPAPA' : 'NUCCIO'} Influencer Guide
      </div>
    </div>
  );
}
