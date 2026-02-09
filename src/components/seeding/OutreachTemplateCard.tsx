import { useState } from 'react';
import { Copy, Check, Edit2, Trash2 } from 'lucide-react';
import {
  OutreachTemplate,
  seedingTypeLabels,
  contentTypeLabels,
} from '../../types';
import { extractVariables, highlightVariables } from './VariableButton';

interface OutreachTemplateCardProps {
  template: OutreachTemplate;
  onCopy: (template: OutreachTemplate) => void;
  onEdit: (template: OutreachTemplate) => void;
  onDelete: (id: string) => void;
}

export default function OutreachTemplateCard({
  template,
  onCopy,
  onEdit,
  onDelete,
}: OutreachTemplateCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    onCopy(template);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleDeleteClick = () => {
    if (confirm(`"${template.name}" 템플릿을 삭제하시겠습니까?`)) {
      onDelete(template.id);
    }
  };

  const variables = extractVariables(template.content);

  // 타입별 색상
  const getTypeColor = () => {
    if (template.seeding_type === 'free') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (template.seeding_type === 'paid') {
      return 'bg-violet-100 text-violet-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  // 브랜드 색상
  const getBrandColor = () => {
    if (template.brand === 'howpapa') {
      return 'bg-orange-100 text-orange-700';
    }
    if (template.brand === 'nucio') {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getBrandLabel = () => {
    if (template.brand === 'howpapa') return '🧡 하우파파';
    if (template.brand === 'nucio') return '💚 누씨오';
    return '전체 브랜드';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <div className="flex items-center gap-1">
            {/* Seeding Type Badge */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor()}`}>
              {template.seeding_type === 'all' ? '전체' : seedingTypeLabels[template.seeding_type]}
            </span>
            {/* Content Type Badge */}
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
              {template.content_type === 'all' ? '전체' : contentTypeLabels[template.content_type]}
            </span>
          </div>
        </div>
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBrandColor()}`}>
          {getBrandLabel()}
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-4">
        <div className="text-sm text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {highlightVariables(template.content)}
        </div>
      </div>

      {/* Variables */}
      {variables.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-400">변수:</span>
            {variables.map((variable, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-xs rounded border border-amber-200"
              >
                {variable}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-xl flex items-center justify-between">
        <span className="text-xs text-gray-500">
          사용: <span className="font-medium text-gray-700">{template.usage_count}회</span>
        </span>

        <div className="flex items-center gap-1">
          {/* Copy Button */}
          <button
            onClick={handleCopyClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isCopied
                ? 'bg-green-500 text-white'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                복사됨!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                복사
              </>
            )}
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDeleteClick}
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
