import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Trash2,
  Plus,
  X,
  Package,
  FileText,
  FlaskConical,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import {
  ProductMaster,
  Brand,
  ProductCategory,
  Manufacturer,
  CertificationInfo,
  ClinicalInfo,
  ProductOption,
} from '../../types';
import { brandLabels } from '../../utils/helpers';

const categoryOptions: ProductCategory[] = [
  '크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'
];

const manufacturerOptions: Manufacturer[] = ['콜마', '코스맥스', '기타'];

const ewgGradeOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'All Green'];

interface ProductMasterFormProps {
  product?: ProductMaster;
  onSave: (data: Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

export default function ProductMasterForm({ product, onSave, onDelete }: ProductMasterFormProps) {
  const navigate = useNavigate();

  // 기본 정보
  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState<Brand>(product?.brand || 'howpapa');
  const [category, setCategory] = useState<ProductCategory>(product?.category || '크림');
  const [description, setDescription] = useState(product?.description || '');

  // 코드 정보
  const [skuId, setSkuId] = useState(product?.skuId || '');
  const [materialCode, setMaterialCode] = useState(product?.materialCode || '');
  const [abbreviation, setAbbreviation] = useState(product?.abbreviation || '');
  const [ampNumber, setAmpNumber] = useState(product?.ampNumber || '');
  const [mockupCode, setMockupCode] = useState(product?.mockupCode || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');

  // 제조 정보
  const [manufacturer, setManufacturer] = useState<Manufacturer>(product?.manufacturer || '콜마');
  const [factoryLocation, setFactoryLocation] = useState(product?.factoryLocation || '');

  // 가격 정보
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 0);
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice ?? 0);
  const [supplyPrice, setSupplyPrice] = useState(product?.supplyPrice ?? 0);

  // 인증 정보
  const [certifications, setCertifications] = useState<CertificationInfo>(
    product?.certifications || {
      vegan: false,
      ewgGrade: undefined,
      dermaTest: false,
      safetyChemical: false,
    }
  );

  // 임상 정보
  const [clinicalTests, setClinicalTests] = useState<ClinicalInfo[]>(product?.clinicalTests || []);
  const [showClinicalModal, setShowClinicalModal] = useState(false);
  const [editingClinical, setEditingClinical] = useState<ClinicalInfo | null>(null);

  // URL 정보
  const [productUrl, setProductUrl] = useState(product?.productUrl || '');
  const [detailPageUrl, setDetailPageUrl] = useState(product?.detailPageUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(product?.thumbnailUrl || '');

  // 옵션 정보
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);

  // 기타
  const [notes, setNotes] = useState(product?.notes || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      brand,
      category,
      description,
      skuId,
      materialCode,
      abbreviation,
      ampNumber,
      mockupCode,
      barcode,
      manufacturer,
      factoryLocation,
      costPrice,
      sellingPrice,
      supplyPrice,
      certifications,
      clinicalTests,
      productUrl,
      detailPageUrl,
      thumbnailUrl,
      options,
      notes,
      isActive,
    };

    onSave(data);
  };

  // 임상 정보 추가/수정
  const handleSaveClinical = (clinical: ClinicalInfo) => {
    if (editingClinical) {
      setClinicalTests(clinicalTests.map(c => c.id === clinical.id ? clinical : c));
    } else {
      setClinicalTests([...clinicalTests, { ...clinical, id: `clinical-${Date.now()}` }]);
    }
    setShowClinicalModal(false);
    setEditingClinical(null);
  };

  const handleDeleteClinical = (id: string) => {
    setClinicalTests(clinicalTests.filter(c => c.id !== id));
  };

  // 옵션 추가/수정
  const handleSaveOption = (option: ProductOption) => {
    if (editingOption) {
      setOptions(options.map(o => o.id === option.id ? option : o));
    } else {
      setOptions([...options, { ...option, id: `option-${Date.now()}` }]);
    }
    setShowOptionModal(false);
    setEditingOption(null);
  };

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-xl">
            <Package className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">제품명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="제품명을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="label">브랜드 *</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value as Brand)}
              className="select-field"
              required
            >
              {Object.entries(brandLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">카테고리 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="select-field"
              required
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label">제품 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="제품에 대한 설명을 입력하세요"
            />
          </div>
        </div>
      </Card>

      {/* 코드 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">코드 정보</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">SKU ID</label>
            <input
              type="text"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="input-field"
              placeholder="SKU-001"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">자재번호</label>
            <input
              type="text"
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              className="input-field"
              placeholder="MAT-001"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">약호</label>
            <input
              type="text"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              className="input-field"
              placeholder="CR-001"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">앰넘버</label>
            <input
              type="text"
              value={ampNumber}
              onChange={(e) => setAmpNumber(e.target.value)}
              className="input-field"
              placeholder="AMP-001"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">모크리코드</label>
            <input
              type="text"
              value={mockupCode}
              onChange={(e) => setMockupCode(e.target.value)}
              className="input-field"
              placeholder="MCK-001"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">바코드</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="input-field"
              placeholder="8801234567890"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>
        </div>
      </Card>

      {/* 제조 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">제조 정보</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">제조사 *</label>
            <select
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value as Manufacturer)}
              className="select-field"
              required
            >
              {manufacturerOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">공장 위치</label>
            <input
              type="text"
              value={factoryLocation}
              onChange={(e) => setFactoryLocation(e.target.value)}
              className="input-field"
              placeholder="예: 경기도 화성시"
            />
          </div>
        </div>
      </Card>

      {/* 가격 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-xl">
            <span className="text-green-600 font-bold">₩</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">가격 정보</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">원가 (매입가) *</label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              className="input-field"
              placeholder="0"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">₩{formatPrice(costPrice)}</p>
          </div>

          <div>
            <label className="label">판매가 *</label>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="input-field"
              placeholder="0"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">₩{formatPrice(sellingPrice)}</p>
          </div>

          <div>
            <label className="label">공급가</label>
            <input
              type="number"
              value={supplyPrice}
              onChange={(e) => setSupplyPrice(Number(e.target.value))}
              className="input-field"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">₩{formatPrice(supplyPrice ?? 0)}</p>
          </div>
        </div>

        {sellingPrice > 0 && costPrice > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">예상 이익</span>
              <span className="font-semibold text-green-600">
                ₩{formatPrice(sellingPrice - costPrice)} ({((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 인증 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-xl">
            <span className="text-yellow-600 font-bold">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">인증 정보</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={certifications.vegan}
              onChange={(e) => setCertifications({ ...certifications, vegan: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="font-medium">비건 인증</span>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={certifications.dermaTest ?? false}
              onChange={(e) => setCertifications({ ...certifications, dermaTest: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="font-medium">더마테스트</span>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={certifications.safetyChemical ?? false}
              onChange={(e) => setCertifications({ ...certifications, safetyChemical: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="font-medium">안전화학</span>
          </label>

          <div>
            <label className="label">EWG 등급</label>
            <select
              value={certifications.ewgGrade || ''}
              onChange={(e) => setCertifications({ ...certifications, ewgGrade: e.target.value || undefined })}
              className="select-field"
            >
              <option value="">선택 안함</option>
              {ewgGradeOptions.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 임상 정보 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <FlaskConical className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">임상 정보</h2>
            {clinicalTests.length > 0 && (
              <Badge variant="warning">{clinicalTests.length}건</Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingClinical(null);
              setShowClinicalModal(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            임상 추가
          </button>
        </div>

        {clinicalTests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">등록된 임상 정보가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {clinicalTests.map((clinical) => (
              <div
                key={clinical.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">{clinical.title}</p>
                  <p className="text-sm text-gray-500">
                    {clinical.institution && `${clinical.institution} · `}
                    {clinical.testDate}
                  </p>
                  {clinical.attachmentName && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {clinical.attachmentName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClinical(clinical);
                      setShowClinicalModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClinical(clinical.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* URL 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-100 rounded-xl">
            <LinkIcon className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">URL 정보</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">제품 URL</label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="input-field"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">상세페이지 URL</label>
            <input
              type="url"
              value={detailPageUrl}
              onChange={(e) => setDetailPageUrl(e.target.value)}
              className="input-field"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">썸네일 이미지 URL</label>
            <div className="flex gap-4">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="input-field flex-1"
                placeholder="https://..."
              />
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt="썸네일 미리보기"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 옵션 정보 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">옵션 정보</h2>
            {options.length > 0 && (
              <Badge variant="info">{options.length}개</Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingOption(null);
              setShowOptionModal(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            옵션 추가
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-center text-gray-500 py-8">등록된 옵션이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">{option.name}: {option.value}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    {option.additionalPrice !== undefined && option.additionalPrice > 0 && (
                      <span>+₩{formatPrice(option.additionalPrice)}</span>
                    )}
                    {option.sku && <span>SKU: {option.sku}</span>}
                    {option.barcode && <span>바코드: {option.barcode}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOption(option);
                      setShowOptionModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOption(option.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 메모 및 상태 */}
      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="추가 메모 사항을 입력하세요"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="font-medium">제품 활성화</span>
          </label>
        </div>
      </Card>

      {/* 버튼 영역 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/product-master')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="flex items-center gap-3">
          {onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="제품 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 제품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            onClick={() => {
              onDelete?.();
              setShowDeleteModal(false);
            }}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* 임상 정보 모달 */}
      <ClinicalModal
        isOpen={showClinicalModal}
        onClose={() => {
          setShowClinicalModal(false);
          setEditingClinical(null);
        }}
        clinical={editingClinical}
        onSave={handleSaveClinical}
      />

      {/* 옵션 모달 */}
      <OptionModal
        isOpen={showOptionModal}
        onClose={() => {
          setShowOptionModal(false);
          setEditingOption(null);
        }}
        option={editingOption}
        onSave={handleSaveOption}
      />
    </form>
  );
}

// 임상 정보 모달 컴포넌트
interface ClinicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinical: ClinicalInfo | null;
  onSave: (clinical: ClinicalInfo) => void;
}

function ClinicalModal({ isOpen, onClose, clinical, onSave }: ClinicalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testDate, setTestDate] = useState('');
  const [institution, setInstitution] = useState('');
  const [results, setResults] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  useEffect(() => {
    if (clinical) {
      setTitle(clinical.title);
      setDescription(clinical.description);
      setTestDate(clinical.testDate || '');
      setInstitution(clinical.institution || '');
      setResults(clinical.results || '');
      setAttachmentUrl(clinical.attachmentUrl || '');
      setAttachmentName(clinical.attachmentName || '');
    } else {
      setTitle('');
      setDescription('');
      setTestDate('');
      setInstitution('');
      setResults('');
      setAttachmentUrl('');
      setAttachmentName('');
    }
  }, [clinical, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: clinical?.id || '',
      title,
      description,
      testDate: testDate || undefined,
      institution: institution || undefined,
      results: results || undefined,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clinical ? '임상 정보 수정' : '임상 정보 추가'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">임상 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="예: 피부 자극 테스트"
            required
          />
        </div>

        <div>
          <label className="label">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[80px]"
            placeholder="임상 설명"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">시험 기관</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="input-field"
              placeholder="예: 피앤케이피부임상연구센타"
            />
          </div>

          <div>
            <label className="label">시험 일자</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label">시험 결과</label>
          <textarea
            value={results}
            onChange={(e) => setResults(e.target.value)}
            className="input-field min-h-[80px]"
            placeholder="시험 결과 요약"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">첨부파일 URL</label>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="input-field"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">첨부파일명</label>
            <input
              type="text"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              className="input-field"
              placeholder="시험결과서.pdf"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="submit" className="btn-primary">
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
}

// 옵션 모달 컴포넌트
interface OptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  option: ProductOption | null;
  onSave: (option: ProductOption) => void;
}

function OptionModal({ isOpen, onClose, option, onSave }: OptionModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [additionalPrice, setAdditionalPrice] = useState(0);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    if (option) {
      setName(option.name);
      setValue(option.value);
      setAdditionalPrice(option.additionalPrice ?? 0);
      setSku(option.sku || '');
      setBarcode(option.barcode || '');
    } else {
      setName('');
      setValue('');
      setAdditionalPrice(0);
      setSku('');
      setBarcode('');
    }
  }, [option, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: option?.id || '',
      name,
      value,
      additionalPrice: additionalPrice || undefined,
      sku: sku || undefined,
      barcode: barcode || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={option ? '옵션 수정' : '옵션 추가'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">옵션명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="예: 용량"
              required
            />
          </div>

          <div>
            <label className="label">옵션값 *</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input-field"
              placeholder="예: 50ml"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">추가 가격</label>
          <input
            type="number"
            value={additionalPrice}
            onChange={(e) => setAdditionalPrice(Number(e.target.value))}
            className="input-field"
            placeholder="0"
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">옵션 SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="input-field"
              placeholder="SKU-001-50"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>

          <div>
            <label className="label">옵션 바코드</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="input-field"
              placeholder="8801234567891"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ textTransform: 'none' }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="submit" className="btn-primary">
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
