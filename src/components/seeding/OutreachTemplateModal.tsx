import { useState, useEffect, useRef } from 'react';
import { X, MessageSquareText, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  OutreachTemplate,
  SeedingType,
  ContentType,
  Brand,
  seedingTypeLabels,
  contentTypeLabels,
} from '../../types';
import VariableButton, { outreachVariables, highlightVariables } from './VariableButton';

interface OutreachTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<OutreachTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => Promise<void>;
  template?: OutreachTemplate | null;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  content: string;
  seeding_type: SeedingType | 'all';
  content_type: ContentType | 'all';
  brand: Brand | 'all';
}

const defaultFormData: FormData = {
  name: '',
  content: '',
  seeding_type: 'all',
  content_type: 'all',
  brand: 'all',
};

export default function OutreachTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  isLoading = false,
}: OutreachTemplateModalProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setFormData({
          name: template.name,
          content: template.content,
          seeding_type: template.seeding_type,
          content_type: template.content_type,
          brand: template.brand,
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setShowPreview(false);
    }
  }, [isOpen, template]);

  const handleVariableClick = (variable: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = formData.content.slice(0, start);
    const after = formData.content.slice(end);

    setFormData({
      ...formData,
      content: before + variable + after,
    });

    // 포커스 및 커서 위치 복원
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '템플릿명을 입력하세요.';
    }
    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력하세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 변수 추출
    const variables = formData.content.match(/\{[^}]+\}/g) || [];

    await onSave({
      name: formData.name.trim(),
      content: formData.content.trim(),
      seeding_type: formData.seeding_type,
      content_type: formData.content_type,
      brand: formData.brand,
      variables: [...new Set(variables)],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {template ? '템플릿 수정' : '새 템플릿'}
                </h2>
                <p className="text-sm text-gray-500">섭외 문구 템플릿을 작성하세요</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 무가 시딩 - 스토리용"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* Type Selectors */}
              <div className="grid grid-cols-3 gap-4">
                {/* Seeding Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시딩 유형</label>
                  <select
                    value={formData.seeding_type}
                    onChange={(e) => setFormData({ ...formData, seeding_type: e.target.value as SeedingType | 'all' })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  >
                    <option value="all">전체</option>
                    {Object.entries(seedingTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 유형</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value as ContentType | 'all' })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  >
                    <option value="all">전체</option>
                    {Object.entries(contentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value as Brand | 'all' })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                  >
                    <option value="all">전체</option>
                    <option value="howpapa">하우파파</option>
                    <option value="nuccio">누씨오</option>
                  </select>
                </div>
              </div>

              {/* Variable Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">변수 삽입</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {outreachVariables.map((variable) => (
                    <VariableButton
                      key={variable.key}
                      variable={variable.key}
                      label={variable.label}
                      onClick={handleVariableClick}
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        편집
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        미리보기
                      </>
                    )}
                  </button>
                </div>

                {showPreview ? (
                  <div className="w-full min-h-[200px] p-4 border border-gray-300 rounded-xl bg-gray-50">
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {formData.content ? highlightVariables(formData.content) : (
                        <span className="text-gray-400">내용을 입력하세요...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="안녕하세요 {인플루언서명}님!

저희 {브랜드명}에서 연락드립니다.
{인플루언서명}님의 계정을 보고 감명받아 협업 제안드리고 싶어요.

{제품명} 제품을 무료로 보내드리고,
스토리에 솔직한 후기 올려주시면 됩니다!

관심 있으시면 편하게 답변 부탁드려요 😊"
                    rows={10}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none ${
                      errors.content ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                )}
                {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {template ? '수정하기' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
