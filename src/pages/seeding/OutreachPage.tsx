import { useState, useEffect, useMemo } from 'react';
import { MessageSquareText, Plus, Filter, X, Check } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import {
  OutreachTemplate,
  SeedingInfluencer,
  SeedingProject,
  SeedingType,
  ContentType,
  Brand,
  seedingTypeLabels,
  contentTypeLabels,
} from '../../types';
import OutreachTemplateCard from '../../components/seeding/OutreachTemplateCard';
import OutreachTemplateModal from '../../components/seeding/OutreachTemplateModal';
import InfluencerSelectModal from '../../components/seeding/InfluencerSelectModal';
import { replaceVariables } from '../../components/seeding/VariableButton';

export default function OutreachPage() {
  const {
    templates,
    isLoading,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    incrementTemplateUsage,
  } = useSeedingStore();

  // Filter states
  const [seedingTypeFilter, setSeedingTypeFilter] = useState<SeedingType | 'all'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<Brand | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Copy modal states
  const [isInfluencerModalOpen, setIsInfluencerModalOpen] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState<OutreachTemplate | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Seeding type filter
      if (seedingTypeFilter !== 'all' && template.seeding_type !== 'all' && template.seeding_type !== seedingTypeFilter) {
        return false;
      }
      // Content type filter
      if (contentTypeFilter !== 'all' && template.content_type !== 'all' && template.content_type !== contentTypeFilter) {
        return false;
      }
      // Brand filter
      if (brandFilter !== 'all' && template.brand !== 'all' && template.brand !== brandFilter) {
        return false;
      }
      return true;
    });
  }, [templates, seedingTypeFilter, contentTypeFilter, brandFilter]);

  const hasActiveFilters = seedingTypeFilter !== 'all' || contentTypeFilter !== 'all' || brandFilter !== 'all';

  // Handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: OutreachTemplate) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (data: Omit<OutreachTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => {
    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data);
        showToastMessage('템플릿이 수정되었습니다.');
      } else {
        await addTemplate(data);
        showToastMessage('템플릿이 생성되었습니다.');
      }
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      showToastMessage('템플릿이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleCopyTemplate = (template: OutreachTemplate) => {
    setCopyingTemplate(template);
    setIsInfluencerModalOpen(true);
  };

  const handleInfluencerSelect = async (influencer: SeedingInfluencer, project: SeedingProject | null) => {
    if (!copyingTemplate) return;

    // 변수 치환을 위한 값 준비
    const formatFollowers = (count: number) => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('ko-KR').format(value) + '원';
    };

    const brandName = project?.brand === 'howpapa' ? '하우파파' : project?.brand === 'nucio' ? '누씨오' : '';

    const values: Record<string, string | number | undefined> = {
      account_id: '@' + influencer.account_id.replace('@', ''),
      account_name: influencer.account_name || influencer.account_id,
      follower_count: formatFollowers(influencer.follower_count),
      product_name: project?.product_name || '',
      brand: brandName,
      fee: influencer.fee ? formatCurrency(influencer.fee) : '',
      assignee_name: '', // TODO: 담당자 정보 연동
      guide_link: influencer.guide_link || '',
    };

    // 변수 치환
    const replacedContent = replaceVariables(copyingTemplate.content, values);

    // 클립보드에 복사
    try {
      await navigator.clipboard.writeText(replacedContent);
      await incrementTemplateUsage(copyingTemplate.id);
      showToastMessage(`✓ 복사됨! (@${influencer.account_id.replace('@', '')})`);
    } catch (error) {
      console.error('Failed to copy:', error);
    }

    setIsInfluencerModalOpen(false);
    setCopyingTemplate(null);
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const clearFilters = () => {
    setSeedingTypeFilter('all');
    setContentTypeFilter('all');
    setBrandFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <MessageSquareText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">섭외 문구</h1>
            <p className="text-sm text-gray-500">인플루언서 연락용 템플릿 관리</p>
          </div>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 템플릿
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            필터
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                {(seedingTypeFilter !== 'all' ? 1 : 0) +
                  (contentTypeFilter !== 'all' ? 1 : 0) +
                  (brandFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              초기화
            </button>
          )}

          <div className="flex-1" />

          <span className="text-sm text-gray-500">
            총 {filteredTemplates.length}개 템플릿
          </span>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {/* Seeding Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">시딩 유형</label>
              <select
                value={seedingTypeFilter}
                onChange={(e) => setSeedingTypeFilter(e.target.value as SeedingType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">전체</option>
                {Object.entries(seedingTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Content Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">콘텐츠 유형</label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as ContentType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">전체</option>
                {Object.entries(contentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">브랜드</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBrandFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setBrandFilter('howpapa')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'howpapa'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  하우파파
                </button>
                <button
                  onClick={() => setBrandFilter('nucio')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandFilter === 'nucio'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  누씨오
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <MessageSquareText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-gray-500 mb-4">다른 필터 조건을 시도해보세요.</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
                <p className="text-gray-500 mb-4">섭외 문구 템플릿을 만들어보세요.</p>
                <button
                  onClick={handleCreateTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  템플릿 만들기
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <OutreachTemplateCard
              key={template.id}
              template={template}
              onCopy={handleCopyTemplate}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      {/* Template Modal */}
      <OutreachTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        template={editingTemplate}
        isLoading={isSaving}
      />

      {/* Influencer Select Modal */}
      <InfluencerSelectModal
        isOpen={isInfluencerModalOpen}
        onClose={() => {
          setIsInfluencerModalOpen(false);
          setCopyingTemplate(null);
        }}
        onSelect={handleInfluencerSelect}
      />

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
