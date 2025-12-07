import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Star } from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import {
  ProjectStatus,
  Priority,
  Brand,
  ProductCategory,
  Manufacturer,
  SamplingProject,
  DetailPageProject,
  InfluencerProject,
  ProductOrderProject,
  GroupPurchaseProject,
  OtherProject,
  Project,
  SampleRating,
} from '../../types';
import { useStore } from '../../store/useStore';
import {
  statusLabels,
  priorityLabels,
  brandLabels,
  formatDate,
} from '../../utils/helpers';

interface ProjectFormProps {
  type: Project['type'];
  project?: Project;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

const categories: ProductCategory[] = [
  '크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'
];

const manufacturers: Manufacturer[] = ['콜마', '코스맥스', '기타'];

const statusOptions: ProjectStatus[] = [
  'planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'
];

const priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

const brandOptions: Brand[] = ['howpapa', 'nuccio'];

export default function ProjectForm({ type, project, onSave, onDelete }: ProjectFormProps) {
  const navigate = useNavigate();
  const { evaluationCriteria } = useStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 공통 필드
  const [title, setTitle] = useState(project?.title || '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'planning');
  const [priority, setPriority] = useState<Priority>(project?.priority || 'medium');
  const [startDate, setStartDate] = useState(project?.startDate || formatDate(new Date(), 'yyyy-MM-dd'));
  const [targetDate, setTargetDate] = useState(project?.targetDate || '');
  const [completedDate, setCompletedDate] = useState(project?.completedDate || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const [assignee, setAssignee] = useState(project?.assignee || '');

  // 샘플링 필드
  const [brand, setBrand] = useState<Brand>(
    (project && 'brand' in project) ? project.brand : 'howpapa'
  );
  const [category, setCategory] = useState<ProductCategory>(
    (project && 'category' in project) ? project.category : '크림'
  );
  const [manufacturer, setManufacturer] = useState<Manufacturer>(
    (project && 'manufacturer' in project) ? project.manufacturer : '콜마'
  );
  const [sampleCode, setSampleCode] = useState(
    (project && 'sampleCode' in project) ? project.sampleCode : ''
  );
  const [round, setRound] = useState(
    (project && 'round' in project) ? project.round : 1
  );
  const [ratings, setRatings] = useState<SampleRating[]>(
    (project && 'ratings' in project) ? project.ratings : []
  );

  // 상세페이지 제작 필드
  const [productName, setProductName] = useState(
    (project && 'productName' in project) ? project.productName : ''
  );
  const [productionCompany, setProductionCompany] = useState(
    (project && 'productionCompany' in project) ? project.productionCompany : ''
  );
  const [workType, setWorkType] = useState<'new' | 'renewal'>(
    (project && 'workType' in project) ? project.workType : 'new'
  );
  const [includesPhotography, setIncludesPhotography] = useState(
    (project && 'includesPhotography' in project) ? project.includesPhotography : false
  );
  const [includesPlanning, setIncludesPlanning] = useState(
    (project && 'includesPlanning' in project) ? project.includesPlanning : false
  );
  const [budget, setBudget] = useState(
    (project && 'budget' in project) ? project.budget : 0
  );
  const [actualCost, setActualCost] = useState(
    (project && 'actualCost' in project) ? project.actualCost : 0
  );

  // 인플루언서 필드
  const [collaborationType, setCollaborationType] = useState<'sponsorship' | 'paid_content'>(
    (project && 'collaborationType' in project) ? project.collaborationType : 'sponsorship'
  );
  const [influencerName, setInfluencerName] = useState(
    (project && 'influencerName' in project) ? project.influencerName || '' : ''
  );
  const [platform, setPlatform] = useState(
    (project && 'platform' in project) ? project.platform || '' : ''
  );

  // 제품 발주 필드
  const [containerMaterial, setContainerMaterial] = useState(
    (project && 'containerMaterial' in project) ? project.containerMaterial : ''
  );
  const [boxMaterial, setBoxMaterial] = useState(
    (project && 'boxMaterial' in project) ? project.boxMaterial : ''
  );
  const [quantity, setQuantity] = useState(
    (project && 'quantity' in project) ? project.quantity || 0 : 0
  );
  const [unitPrice, setUnitPrice] = useState(
    (project && 'unitPrice' in project) ? project.unitPrice || 0 : 0
  );

  // 공동구매 필드
  const [sellerName, setSellerName] = useState(
    (project && 'sellerName' in project) ? project.sellerName : ''
  );
  const [revenue, setRevenue] = useState(
    (project && 'revenue' in project) ? project.revenue : 0
  );
  const [contributionProfit, setContributionProfit] = useState(
    (project && 'contributionProfit' in project) ? project.contributionProfit : 0
  );

  // 평가 항목 초기화
  useEffect(() => {
    if (type === 'sampling' && ratings.length === 0) {
      const categoryRatings = evaluationCriteria
        .filter((c) => c.category === category && c.isActive)
        .map((c) => ({
          criteriaId: c.id,
          criteriaName: c.name,
          score: 0,
        }));
      setRatings(categoryRatings);
    }
  }, [type, category, evaluationCriteria, ratings.length]);

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

    let projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

    switch (type) {
      case 'sampling':
        projectData = {
          ...baseData,
          type: 'sampling',
          brand,
          category,
          manufacturer,
          sampleCode,
          round,
          ratings,
          averageRating: ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
            : undefined,
        } as Omit<SamplingProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;

      case 'detail_page':
        projectData = {
          ...baseData,
          type: 'detail_page',
          brand,
          category,
          productName,
          productionCompany,
          workType,
          includesPhotography,
          includesPlanning,
          budget,
          actualCost,
        } as Omit<DetailPageProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;

      case 'influencer':
        projectData = {
          ...baseData,
          type: 'influencer',
          collaborationType,
          influencerName,
          platform,
          budget,
          actualCost,
        } as Omit<InfluencerProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;

      case 'product_order':
        projectData = {
          ...baseData,
          type: 'product_order',
          brand,
          manufacturer,
          containerMaterial,
          boxMaterial,
          quantity,
          unitPrice,
          totalAmount: quantity * unitPrice,
        } as Omit<ProductOrderProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;

      case 'group_purchase':
        projectData = {
          ...baseData,
          type: 'group_purchase',
          brand,
          sellerName,
          revenue,
          contributionProfit,
          profitMargin: revenue > 0 ? (contributionProfit / revenue) * 100 : undefined,
        } as Omit<GroupPurchaseProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;

      case 'other':
      default:
        projectData = {
          ...baseData,
          type: 'other',
        } as Omit<OtherProject, 'id' | 'createdAt' | 'updatedAt'>;
        break;
    }

    onSave(projectData);
  };

  const updateRating = (criteriaId: string, score: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.criteriaId === criteriaId ? { ...r, score } : r))
    );
  };

  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'sampling':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">브랜드</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as Brand)}
                  className="select-field"
                >
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>{brandLabels[b]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ProductCategory);
                    // Reset ratings when category changes
                    const newRatings = evaluationCriteria
                      .filter((c) => c.category === e.target.value && c.isActive)
                      .map((c) => ({
                        criteriaId: c.id,
                        criteriaName: c.name,
                        score: 0,
                      }));
                    setRatings(newRatings);
                  }}
                  className="select-field"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">제조사</label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value as Manufacturer)}
                  className="select-field"
                >
                  {manufacturers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">샘플 코드</label>
                <input
                  type="text"
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                  className="input-field"
                  placeholder="샘플 코드 입력"
                />
              </div>
              <div>
                <label className="label">회차</label>
                <select
                  value={round}
                  onChange={(e) => setRound(Number(e.target.value))}
                  className="select-field"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>{r}회</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 평가 항목 */}
            {ratings.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">평가 항목</h4>
                <div className="space-y-4">
                  {ratings.map((rating) => {
                    const criteria = evaluationCriteria.find(c => c.id === rating.criteriaId);
                    return (
                      <div key={rating.criteriaId} className="flex items-start gap-4">
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
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );

      case 'detail_page':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">브랜드</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="select-field"
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{brandLabels[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="select-field"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">제품명</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="input-field"
                placeholder="제품명 입력"
              />
            </div>
            <div>
              <label className="label">제작 업체</label>
              <input
                type="text"
                value={productionCompany}
                onChange={(e) => setProductionCompany(e.target.value)}
                className="input-field"
                placeholder="제작 업체 입력"
              />
            </div>
            <div>
              <label className="label">업무 구분</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as 'new' | 'renewal')}
                className="select-field"
              >
                <option value="new">신규</option>
                <option value="renewal">리뉴얼</option>
              </select>
            </div>
            <div>
              <label className="label">예산</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="input-field"
                placeholder="예산 입력"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesPhotography}
                  onChange={(e) => setIncludesPhotography(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">촬영 포함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesPlanning}
                  onChange={(e) => setIncludesPlanning(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">기획 포함</span>
              </label>
            </div>
          </div>
        );

      case 'influencer':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">협업 유형</label>
              <select
                value={collaborationType}
                onChange={(e) => setCollaborationType(e.target.value as 'sponsorship' | 'paid_content')}
                className="select-field"
              >
                <option value="sponsorship">제품 협찬</option>
                <option value="paid_content">유가 콘텐츠</option>
              </select>
            </div>
            <div>
              <label className="label">인플루언서</label>
              <input
                type="text"
                value={influencerName}
                onChange={(e) => setInfluencerName(e.target.value)}
                className="input-field"
                placeholder="인플루언서 이름"
              />
            </div>
            <div>
              <label className="label">플랫폼</label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-field"
                placeholder="인스타그램, 유튜브 등"
              />
            </div>
            <div>
              <label className="label">예산</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="input-field"
                placeholder="예산 입력"
              />
            </div>
          </div>
        );

      case 'product_order':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">브랜드</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="select-field"
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{brandLabels[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">제조사</label>
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value as Manufacturer)}
                className="select-field"
              >
                {manufacturers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">용기 부자재</label>
              <input
                type="text"
                value={containerMaterial}
                onChange={(e) => setContainerMaterial(e.target.value)}
                className="input-field"
                placeholder="용기 부자재 입력"
              />
            </div>
            <div>
              <label className="label">단상자 부자재</label>
              <input
                type="text"
                value={boxMaterial}
                onChange={(e) => setBoxMaterial(e.target.value)}
                className="input-field"
                placeholder="단상자 부자재 입력"
              />
            </div>
            <div>
              <label className="label">수량</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input-field"
                placeholder="수량 입력"
              />
            </div>
            <div>
              <label className="label">단가</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="input-field"
                placeholder="단가 입력"
              />
            </div>
          </div>
        );

      case 'group_purchase':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">브랜드</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="select-field"
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{brandLabels[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">셀러</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="input-field"
                placeholder="셀러 이름 입력"
              />
            </div>
            <div>
              <label className="label">매출</label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className="input-field"
                placeholder="매출 입력"
              />
            </div>
            <div>
              <label className="label">공헌 이익</label>
              <input
                type="number"
                value={contributionProfit}
                onChange={(e) => setContributionProfit(Number(e.target.value))}
                className="input-field"
                placeholder="공헌 이익 입력"
              />
            </div>
          </div>
        );

      case 'other':
      default:
        return null;
    }
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
            {status === 'completed' && (
              <div>
                <label className="label">완료일</label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
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
