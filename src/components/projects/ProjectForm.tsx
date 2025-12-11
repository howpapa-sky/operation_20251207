import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Star } from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import {
  ProjectStatus,
  Priority,
  Project,
  SampleRating,
  ProjectType,
  ProjectFieldSetting,
  FieldType,
} from '../../types';
import { useStore } from '../../store/useStore';
import { useProjectFieldsStore } from '../../store/useProjectFieldsStore';
import {
  statusLabels,
  priorityLabels,
  formatDate,
} from '../../utils/helpers';

interface ProjectFormProps {
  type: Project['type'];
  project?: Project;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

const statusOptions: ProjectStatus[] = [
  'planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'
];

const priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

export default function ProjectForm({ type, project, onSave, onDelete }: ProjectFormProps) {
  const navigate = useNavigate();
  const { evaluationCriteria } = useStore();
  const { getFieldsForType, fetchFieldSettings, fieldSettings } = useProjectFieldsStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 필드 설정 가져오기
  useEffect(() => {
    if (fieldSettings.length === 0) {
      fetchFieldSettings();
    }
  }, [fieldSettings.length, fetchFieldSettings]);

  // 공통 필드
  const [title, setTitle] = useState(project?.title || '');
  const [status, setStatus] = useState<ProjectStatus | ''>(project?.status || '');
  const [priority, setPriority] = useState<Priority | ''>(project?.priority || '');
  const [startDate, setStartDate] = useState(project?.startDate || formatDate(new Date(), 'yyyy-MM-dd'));
  const [targetDate, setTargetDate] = useState(project?.targetDate || '');
  const [completedDate, setCompletedDate] = useState(project?.completedDate || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const [assignee, setAssignee] = useState(project?.assignee || '');

  // 동적 필드 값 관리
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string | number | boolean>>({});

  // 샘플링 전용: 평가 항목
  const [ratings, setRatings] = useState<SampleRating[]>(
    (project && 'ratings' in project) ? project.ratings : []
  );

  // 프로젝트 데이터에서 동적 필드 값 초기화
  useEffect(() => {
    if (project) {
      const values: Record<string, string | number | boolean> = {};
      const fields = getFieldsForType(type);

      fields.forEach((field) => {
        const key = field.fieldKey;
        if (key in project) {
          values[key] = (project as unknown as Record<string, unknown>)[key] as string | number | boolean;
        }
      });

      setDynamicFieldValues(values);
    }
  }, [project, type, getFieldsForType]);

  // 평가 항목 초기화 (샘플링용)
  useEffect(() => {
    if (type === 'sampling' && ratings.length === 0) {
      const categoryValue = dynamicFieldValues['category'] as string || '크림';
      const categoryRatings = evaluationCriteria
        .filter((c) => c.category === categoryValue && c.isActive)
        .map((c) => ({
          criteriaId: c.id,
          criteriaName: c.name,
          score: 0,
        }));
      setRatings(categoryRatings);
    }
  }, [type, dynamicFieldValues, evaluationCriteria, ratings.length]);

  // 동적 필드 값 변경 핸들러
  const handleFieldChange = (fieldKey: string, value: string | number | boolean) => {
    setDynamicFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));

    // 샘플링에서 카테고리가 변경되면 평가 항목 초기화
    if (type === 'sampling' && fieldKey === 'category') {
      const newRatings = evaluationCriteria
        .filter((c) => c.category === value && c.isActive)
        .map((c) => ({
          criteriaId: c.id,
          criteriaName: c.name,
          score: 0,
        }));
      setRatings(newRatings);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const baseData = {
      title,
      status,
      priority,
      startDate,
      targetDate,
      completedDate: completedDate || undefined,
      notes,
      assignee,
    };

    // 동적 필드 값 추가
    const projectData: Record<string, unknown> = {
      ...baseData,
      type,
      ...dynamicFieldValues,
    };

    // 샘플링인 경우 평가 항목 추가
    if (type === 'sampling') {
      projectData.ratings = ratings;
      projectData.averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : undefined;
    }

    // 제품 발주인 경우 총액 계산
    if (type === 'product_order') {
      const qty = dynamicFieldValues['quantity'] as number || 0;
      const price = dynamicFieldValues['unitPrice'] as number || 0;
      projectData.totalAmount = qty * price;
    }

    // 공동구매인 경우 이익률 계산
    if (type === 'group_purchase') {
      const rev = dynamicFieldValues['revenue'] as number || 0;
      const profit = dynamicFieldValues['contributionProfit'] as number || 0;
      projectData.profitMargin = rev > 0 ? (profit / rev) * 100 : undefined;
    }

    onSave(projectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
  };

  const updateRating = (criteriaId: string, score: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.criteriaId === criteriaId ? { ...r, score } : r))
    );
  };

  const updateRatingComment = (criteriaId: string, comment: string) => {
    setRatings((prev) =>
      prev.map((r) => (r.criteriaId === criteriaId ? { ...r, comment } : r))
    );
  };

  // 동적 필드 렌더링
  const renderDynamicField = (field: ProjectFieldSetting) => {
    const value = dynamicFieldValues[field.fieldKey];
    const isRequired = field.isRequired;

    switch (field.fieldType) {
      case 'text':
        return (
          <div key={field.id}>
            <label className="label">
              {field.fieldLabel}
              {isRequired && ' *'}
            </label>
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              className="input-field"
              placeholder={field.placeholder || `${field.fieldLabel} 입력`}
              required={isRequired}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <label className="label">
              {field.fieldLabel}
              {isRequired && ' *'}
            </label>
            <input
              type="number"
              value={(value as number) || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, Number(e.target.value))}
              className="input-field"
              placeholder={field.placeholder || `${field.fieldLabel} 입력`}
              required={isRequired}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id}>
            <label className="label">
              {field.fieldLabel}
              {isRequired && ' *'}
            </label>
            <select
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              className="select-field"
              required={isRequired}
            >
              <option value="">---</option>
              {field.fieldOptions?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(value as boolean) || false}
                onChange={(e) => handleFieldChange(field.fieldKey, e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{field.fieldLabel}</span>
            </label>
          </div>
        );

      case 'date':
        return (
          <div key={field.id}>
            <label className="label">
              {field.fieldLabel}
              {isRequired && ' *'}
            </label>
            <input
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              className="input-field"
              required={isRequired}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="md:col-span-2">
            <label className="label">
              {field.fieldLabel}
              {isRequired && ' *'}
            </label>
            <textarea
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              className="input-field min-h-24"
              placeholder={field.placeholder || `${field.fieldLabel} 입력`}
              required={isRequired}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // 동적 필드 목록 렌더링
  const renderTypeSpecificFields = () => {
    // 선택된 브랜드에 따라 필드 필터링
    const selectedBrand = dynamicFieldValues['brand'] as string | undefined;
    const fields = getFieldsForType(type, selectedBrand);

    // 체크박스 필드와 나머지 필드 분리
    const checkboxFields = fields.filter((f) => f.fieldType === 'checkbox');
    const otherFields = fields.filter((f) => f.fieldType !== 'checkbox');

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {otherFields.map(renderDynamicField)}

          {/* 체크박스 필드들은 한 줄에 모아서 표시 */}
          {checkboxFields.length > 0 && (
            <div className="flex items-center gap-6 md:col-span-2">
              {checkboxFields.map(renderDynamicField)}
            </div>
          )}
        </div>

        {/* 샘플링인 경우 평가 항목 렌더링 */}
        {type === 'sampling' && ratings.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">평가 항목</h4>
            <div className="space-y-4">
              {ratings.map((rating) => {
                const criteria = evaluationCriteria.find(c => c.id === rating.criteriaId);
                return (
                  <div key={rating.criteriaId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-start gap-4">
                      <div className="w-32 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">{rating.criteriaName}</span>
                        {criteria?.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{criteria.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => updateRating(rating.criteriaId, score)}
                            className={`p-1 transition-all ${
                              score <= rating.score ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">{rating.score}/5</span>
                    </div>
                    <div className="mt-3">
                      <input
                        type="text"
                        value={rating.comment || ''}
                        onChange={(e) => updateRatingComment(rating.criteriaId, e.target.value)}
                        className="input-field text-sm"
                        placeholder={`${rating.criteriaName}에 대한 메모 (선택사항)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          뒤로 가기
        </button>
        <div className="flex items-center gap-3">
          {project && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">프로젝트명 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="프로젝트명을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="label">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="select-field"
              >
                <option value="">---</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="select-field"
              >
                <option value="">---</option>
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">시작일 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">목표일 *</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">완료일</label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">담당자</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="input-field"
                placeholder="담당자 이름"
              />
            </div>
          </div>
        </Card>

        {/* 프로젝트 유형별 필드 */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">상세 정보</h3>
          {renderTypeSpecificFields()}
        </Card>

        {/* 비고 */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">비고</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field min-h-32"
            placeholder="추가 메모를 입력하세요..."
          />
        </Card>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="프로젝트 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(false);
              onDelete?.();
            }}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>
    </form>
  );
}
