import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Hash,
} from 'lucide-react';
import { ProductGuide, contentTypeLabels } from '../../types';

interface ProductGuideCardProps {
  guide: ProductGuide;
  onDelete: (id: string) => void;
  onCopyLink: (guide: ProductGuide) => void;
}

export default function ProductGuideCard({
  guide,
  onDelete,
  onCopyLink,
}: ProductGuideCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    onCopyLink(guide);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = () => {
    if (confirm(`"${guide.product_name}" 가이드를 삭제하시겠습니까?`)) {
      onDelete(guide.id);
    }
  };

  const brandConfig = {
    howpapa: {
      emoji: '🧡',
      label: '하우파파',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      badgeBg: 'bg-orange-100',
    },
    nuccio: {
      emoji: '💚',
      label: '누씨오',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      badgeBg: 'bg-green-100',
    },
  };

  const config = brandConfig[guide.brand];
  const contentTypeLabel = contentTypeLabels[guide.content_type];
  const hasImage = guide.image_urls && guide.image_urls.length > 0;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-xl border-2 ${guide.brand === 'howpapa' ? 'border-orange-100 hover:border-orange-200' : 'border-green-100 hover:border-green-200'} transition-all group overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${config.bgColor} border-b ${config.borderColor} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeBg} ${config.textColor}`}>
            {config.emoji} {config.label}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-gray-600">
            {contentTypeLabel}
          </span>
        </div>
        {guide.is_public && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            공개
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Image + Title */}
        <div className="flex gap-3 mb-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
            {hasImage ? (
              <img
                src={guide.image_urls[0]}
                alt={guide.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{guide.product_name}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {guide.description || '설명 없음'}
            </p>
          </div>
        </div>

        {/* Hashtags Preview */}
        {guide.hashtags && guide.hashtags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {guide.hashtags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
              >
                #{tag.replace('#', '')}
              </span>
            ))}
            {guide.hashtags.length > 4 && (
              <span className="text-xs text-gray-400">
                +{guide.hashtags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Key Points Preview */}
        {guide.key_points && guide.key_points.length > 0 && (
          <div className="text-xs text-gray-500 mb-3">
            <span className="font-medium">핵심포인트:</span>{' '}
            {guide.key_points.slice(0, 2).join(', ')}
            {guide.key_points.length > 2 && ` 외 ${guide.key_points.length - 2}개`}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          수정: {guide.updated_by || '관리자'} | {formatDate(guide.updated_at)}
        </span>

        <div className="flex items-center gap-1">
          {/* Copy Link Button */}
          {guide.is_public && (
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  복사됨
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  링크복사
                </>
              )}
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/seeding/guides/${guide.id}/edit`)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
