import { useState, useEffect } from 'react';
import { X, FolderKanban, Loader2 } from 'lucide-react';
import { SeedingProject, SeedingProjectStatus, Brand, ProductMaster } from '../../types';
import ProductSelector from './ProductSelector';
import UserSelect from '../common/UserSelect';

interface SeedingProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SeedingProject, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  project?: SeedingProject | null;
  isLoading?: boolean;
}

const defaultFormData = {
  name: '',
  brand: 'howpapa' as Brand,
  product_id: '',
  product_name: '',
  start_date: '',
  end_date: '',
  target_count: 30,
  cost_price: 0,
  selling_price: 0,
  status: 'planning' as SeedingProjectStatus,
  description: '',
  assignee_id: '',
};

export default function SeedingProjectModal({
  isOpen,
  onClose,
  onSave,
  project,
  isLoading = false,
}: SeedingProjectModalProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(project);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        brand: project.brand,
        product_id: project.product_id || '',
        product_name: project.product_name,
        start_date: project.start_date,
        end_date: project.end_date,
        target_count: project.target_count,
        cost_price: project.cost_price,
        selling_price: project.selling_price,
        status: project.status,
        description: project.description || '',
        assignee_id: project.assignee_id || '',
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
  }, [project, isOpen]);

  const handleProductSelect = (product: ProductMaster | null) => {
    if (product) {
      setFormData({
        ...formData,
        product_id: product.id,
        product_name: product.name,
        cost_price: product.costPrice,
        selling_price: product.sellingPrice,
        brand: product.brand,
      });
    } else {
      setFormData({
        ...formData,
        product_id: '',
        product_name: '',
        cost_price: 0,
        selling_price: 0,
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '프로젝트명을 입력하세요.';
    }
    if (!formData.start_date) {
      newErrors.start_date = '시작일을 선택하세요.';
    }
    if (!formData.end_date) {
      newErrors.end_date = '종료일을 선택하세요.';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = '종료일은 시작일 이후여야 합니다.';
    }
    if (formData.target_count < 1) {
      newErrors.target_count = '목표 시딩 수는 1 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      name: formData.name.trim(),
      brand: formData.brand,
      product_id: formData.product_id || undefined,
      product_name: formData.product_name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      target_count: formData.target_count,
      cost_price: formData.cost_price,
      selling_price: formData.selling_price,
      status: formData.status,
      description: formData.description.trim() || undefined,
      assignee_id: formData.assignee_id || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isEdit ? '프로젝트 수정' : '새 시딩 프로젝트'}
                </h2>
                <p className="text-sm text-gray-500">제품별 인플루언서 시딩 캠페인</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                프로젝트명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 리프팅크림 1월 시딩"
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Brand & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">브랜드</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, brand: 'howpapa' })}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
                      formData.brand === 'howpapa'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    하우파파
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, brand: 'nuccio' })}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
                      formData.brand === 'nuccio'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    누씨오
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as SeedingProjectStatus })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="planning">기획중</option>
                  <option value="active">진행중</option>
                  <option value="completed">완료</option>
                  <option value="paused">일시중지</option>
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                제품 선택 (선택)
              </label>
              <ProductSelector
                value={formData.product_id}
                brand={formData.brand}
                onChange={handleProductSelect}
                placeholder="제품 마스터에서 선택..."
              />
            </div>

            {/* Manual Product Name (if no product selected) */}
            {!formData.product_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  제품명 (직접 입력)
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="시딩할 제품명을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                />
              </div>
            )}

            {/* Price Info (if no product selected) */}
            {!formData.product_id && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    제품 원가
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₩</span>
                    <input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) =>
                        setFormData({ ...formData, cost_price: Number(e.target.value) })
                      }
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    제품 판매가
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₩</span>
                    <input
                      type="number"
                      value={formData.selling_price}
                      onChange={(e) =>
                        setFormData({ ...formData, selling_price: Number(e.target.value) })
                      }
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                    errors.start_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                    errors.end_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.end_date && <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>}
              </div>
            </div>

            {/* Target Count & Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  목표 시딩 수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.target_count}
                  onChange={(e) =>
                    setFormData({ ...formData, target_count: Number(e.target.value) })
                  }
                  min={1}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                    errors.target_count ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.target_count && (
                  <p className="mt-1 text-sm text-red-500">{errors.target_count}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
                <UserSelect
                  value={formData.assignee_id}
                  onChange={(userId) => setFormData({ ...formData, assignee_id: userId || '' })}
                  placeholder="담당자 선택..."
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">설명 (선택)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="프로젝트에 대한 간단한 설명..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? '저장' : '생성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
