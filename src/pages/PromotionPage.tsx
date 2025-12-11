import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Tag,
  Edit,
  Trash2,
  Eye,
  X,
  MoreVertical,
  Calendar,
  Package,
  ArrowLeft,
  Save,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { usePromotionStore } from '../store/usePromotionStore';
import { useProductMasterStore } from '../store/useProductMasterStore';
import {
  Promotion,
  PromotionStatus,
  PromotionPack,
  PromotionPackProduct,
  promotionStatusLabels,
  ProductMaster,
} from '../types';
import { formatDate, brandLabels } from '../utils/helpers';

const statusColors: Record<PromotionStatus, string> = {
  scheduled: 'info',
  active: 'success',
  ended: 'gray',
};

export default function PromotionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { promotions, addPromotion, updatePromotion, deletePromotion, updatePromotionStatuses } = usePromotionStore();
  const isEditMode = location.pathname.endsWith('/edit');

  useEffect(() => {
    updatePromotionStatuses();
  }, [updatePromotionStatuses]);

  // 새 프로모션 등록
  if (id === 'new') {
    const handleSave = (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
      addPromotion(data);
      navigate('/promotion');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 프로모션 등록</h1>
        <PromotionForm onSave={handleSave} />
      </div>
    );
  }

  // 프로모션 수정
  if (id && isEditMode) {
    const promotion = promotions.find((p) => p.id === id);

    if (!promotion) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">프로모션을 찾을 수 없습니다.</p>
        </div>
      );
    }

    const handleSave = (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
      updatePromotion(id, data);
      navigate(`/promotion/${id}`);
    };

    const handleDelete = () => {
      deletePromotion(id);
      navigate('/promotion');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">프로모션 수정</h1>
        <PromotionForm promotion={promotion} onSave={handleSave} onDelete={handleDelete} />
      </div>
    );
  }

  // 프로모션 상세보기
  if (id) {
    const promotion = promotions.find((p) => p.id === id);

    if (!promotion) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">프로모션을 찾을 수 없습니다.</p>
        </div>
      );
    }

    return <PromotionDetail promotion={promotion} />;
  }

  // 프로모션 목록
  return <PromotionList />;
}

// 프로모션 목록 컴포넌트
function PromotionList() {
  const navigate = useNavigate();
  const { promotions, deletePromotion, updatePromotionStatuses } = usePromotionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PromotionStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    updatePromotionStatuses();
  }, [updatePromotionStatuses]);

  const filteredPromotions = useMemo(() => {
    return promotions
      .filter((p) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return p.name.toLowerCase().includes(query);
        }
        return true;
      })
      .filter((p) => (selectedStatus ? p.status === selectedStatus : true))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [promotions, searchQuery, selectedStatus]);

  const handleDelete = (id: string) => {
    deletePromotion(id);
    setDeleteModalId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
  };

  const hasFilters = searchQuery || selectedStatus;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getStatusBadgeVariant = (status: PromotionStatus): 'success' | 'info' | 'warning' | 'primary' | 'danger' | 'gray' => {
    const variants: Record<PromotionStatus, 'success' | 'info' | 'warning' | 'primary' | 'danger' | 'gray'> = {
      scheduled: 'info',
      active: 'success',
      ended: 'gray',
    };
    return variants[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Tag className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로모션 관리</h1>
            <p className="text-gray-500">
              총 {filteredPromotions.length}개의 프로모션
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/promotion/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          프로모션 등록
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="프로모션명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 border-primary-200' : ''}`}
          >
            <Filter className="w-4 h-4" />
            필터
            {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PromotionStatus | '')}
                className="select-field w-40"
              >
                <option value="">모든 상태</option>
                {Object.entries(promotionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Promotion List */}
      {filteredPromotions.length === 0 ? (
        <Card>
          <EmptyState
            title="등록된 프로모션이 없습니다"
            description="새 프로모션을 등록하여 관리를 시작하세요"
            action={
              <button
                onClick={() => navigate('/promotion/new')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                프로모션 등록
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((promotion) => {
            const isMenuOpen = actionMenuId === promotion.id;
            const totalPacks = promotion.packs.length;
            const minPrice = promotion.packs.length > 0
              ? Math.min(...promotion.packs.map(p => p.promotionPrice))
              : 0;
            const maxPrice = promotion.packs.length > 0
              ? Math.max(...promotion.packs.map(p => p.promotionPrice))
              : 0;

            return (
              <Card
                key={promotion.id}
                className="p-5 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/promotion/${promotion.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(promotion.status)}>
                      {promotionStatusLabels[promotion.status]}
                    </Badge>
                    {!promotion.isActive && (
                      <Badge variant="gray">비활성</Badge>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMenuOpen) {
                          setActionMenuId(null);
                          setMenuPosition(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({
                            top: rect.top - 8,
                            left: rect.right - 160,
                          });
                          setActionMenuId(promotion.id);
                        }
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && menuPosition && (
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(null);
                            setMenuPosition(null);
                          }}
                        />
                        <div
                          className="fixed w-40 bg-white rounded-xl shadow-elegant-lg border border-gray-100 z-[9999] overflow-hidden"
                          style={{
                            top: menuPosition.top,
                            left: menuPosition.left,
                            transform: 'translateY(-100%)',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/promotion/${promotion.id}`);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            보기
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/promotion/${promotion.id}/edit`);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(null);
                              setMenuPosition(null);
                              setDeleteModalId(promotion.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {promotion.name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>{promotion.startDate} ~ {promotion.endDate}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>구성 {totalPacks}개</span>
                  </div>
                  {totalPacks > 0 && (
                    <div className="text-sm">
                      <span className="font-semibold text-purple-600">
                        ₩{formatPrice(minPrice)}
                        {minPrice !== maxPrice && ` ~ ₩${formatPrice(maxPrice)}`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="프로모션 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 프로모션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModalId(null)}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            onClick={() => handleDelete(deleteModalId!)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>
    </div>
  );
}

// 프로모션 폼 컴포넌트
interface PromotionFormProps {
  promotion?: Promotion;
  onSave: (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

function PromotionForm({ promotion, onSave, onDelete }: PromotionFormProps) {
  const navigate = useNavigate();
  const { products } = useProductMasterStore();

  const [name, setName] = useState(promotion?.name || '');
  const [description, setDescription] = useState(promotion?.description || '');
  const [startDate, setStartDate] = useState(promotion?.startDate || '');
  const [endDate, setEndDate] = useState(promotion?.endDate || '');
  const [notes, setNotes] = useState(promotion?.notes || '');
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
  const [packs, setPacks] = useState<PromotionPack[]>(promotion?.packs || []);

  const [showPackModal, setShowPackModal] = useState(false);
  const [editingPack, setEditingPack] = useState<PromotionPack | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getStatus = (): PromotionStatus => {
    const today = new Date().toISOString().split('T')[0];
    if (startDate > today) return 'scheduled';
    if (endDate < today) return 'ended';
    return 'active';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      startDate,
      endDate,
      status: getStatus(),
      packs,
      notes,
      isActive,
    });
  };

  const handleSavePack = (pack: PromotionPack) => {
    if (editingPack) {
      setPacks(packs.map(p => p.id === pack.id ? pack : p));
    } else {
      setPacks([...packs, { ...pack, id: `pack-${Date.now()}` }]);
    }
    setShowPackModal(false);
    setEditingPack(null);
  };

  const handleDeletePack = (packId: string) => {
    setPacks(packs.filter(p => p.id !== packId));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Tag className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">프로모션명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="예: 2025년 신년 맞이 할인"
              required
            />
          </div>

          <div>
            <label className="label">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="프로모션에 대한 설명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className="label">종료일 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="추가 메모 사항"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="font-medium">프로모션 활성화</span>
          </label>
        </div>
      </Card>

      {/* 구성 (패키지) 정보 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">제품 구성 및 가격</h2>
            {packs.length > 0 && (
              <Badge variant="success">{packs.length}개</Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPack(null);
              setShowPackModal(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            구성 추가
          </button>
        </div>

        {packs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            등록된 제품 구성이 없습니다. 구성을 추가해주세요.
          </p>
        ) : (
          <div className="space-y-4">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{pack.description}</h4>
                    <p className="text-sm text-gray-500">구성 {pack.packSize}개</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPack(pack);
                        setShowPackModal(true);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePack(pack.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {pack.products.map((product) => (
                    <Badge key={product.id} variant="gray">
                      {product.productName} x{product.quantity}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">정상가</p>
                    <p className="text-sm line-through text-gray-400">₩{formatPrice(pack.regularPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">상시 할인가</p>
                    <p className="text-sm text-gray-600">₩{formatPrice(pack.discountPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">최종 행사가</p>
                    <p className="text-sm font-bold text-purple-600">₩{formatPrice(pack.promotionPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 버튼 영역 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/promotion')}
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
        title="프로모션 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 프로모션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

      {/* 구성 추가/수정 모달 */}
      <PackModal
        isOpen={showPackModal}
        onClose={() => {
          setShowPackModal(false);
          setEditingPack(null);
        }}
        pack={editingPack}
        products={products}
        onSave={handleSavePack}
      />
    </form>
  );
}

// 구성 모달 컴포넌트
interface PackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: PromotionPack | null;
  products: ProductMaster[];
  onSave: (pack: PromotionPack) => void;
}

function PackModal({ isOpen, onClose, pack, products, onSave }: PackModalProps) {
  const [description, setDescription] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<PromotionPackProduct[]>([]);
  const [regularPrice, setRegularPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState(0);
  const [promotionPrice, setPromotionPrice] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [autoDescription, setAutoDescription] = useState(true);

  // 선택된 제품의 옵션 목록
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const hasOptions = selectedProduct && selectedProduct.options.length > 0;

  useEffect(() => {
    if (pack) {
      setDescription(pack.description);
      setSelectedProducts(pack.products);
      setRegularPrice(pack.regularPrice);
      setDiscountPrice(pack.discountPrice);
      setPromotionPrice(pack.promotionPrice);
      setAutoDescription(false);
    } else {
      setDescription('');
      setSelectedProducts([]);
      setRegularPrice(0);
      setDiscountPrice(0);
      setPromotionPrice(0);
      setAutoDescription(true);
    }
  }, [pack, isOpen]);

  // 구성 설명 자동 생성
  useEffect(() => {
    if (!autoDescription || selectedProducts.length === 0) return;

    const grouped: Record<string, { name: string; optionNames: string[]; quantity: number }> = {};

    selectedProducts.forEach(p => {
      // 옵션이 있는 경우 옵션명 기준으로 그룹핑
      if (p.optionName) {
        const key = `${p.productId}-opt`;
        if (!grouped[key]) {
          grouped[key] = { name: p.productName, optionNames: [], quantity: 0 };
        }
        grouped[key].optionNames.push(p.optionName);
        grouped[key].quantity += p.quantity;
      } else {
        // 옵션이 없는 경우 제품명 기준
        const key = p.productId;
        if (!grouped[key]) {
          grouped[key] = { name: p.productName, optionNames: [], quantity: 0 };
        }
        grouped[key].quantity += p.quantity;
      }
    });

    const parts = Object.values(grouped).map(g => {
      if (g.optionNames.length > 0) {
        return `${g.name} ${g.optionNames.length}종 (${g.optionNames.join('+')})`;
      }
      return g.quantity > 1 ? `${g.name} ${g.quantity}개` : g.name;
    });

    setDescription(parts.join(' + '));
  }, [selectedProducts, autoDescription]);

  // 정상가 자동 계산
  useEffect(() => {
    const totalPrice = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
    setRegularPrice(totalPrice);
  }, [selectedProducts]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 제품 + 옵션 추가
  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    let productName = product.name;
    let optionName: string | undefined;
    let unitPrice = product.sellingPrice;

    // 옵션이 선택된 경우
    if (selectedOptionId) {
      const option = product.options.find(o => o.id === selectedOptionId);
      if (option) {
        optionName = option.value;
        unitPrice = product.sellingPrice + (option.additionalPrice || 0);
      }
    }

    // 동일 제품+옵션이 이미 있는지 확인
    const existingKey = selectedOptionId
      ? `${selectedProductId}-${selectedOptionId}`
      : selectedProductId;

    const existing = selectedProducts.find(p => {
      const key = p.optionId
        ? `${p.productId}-${p.optionId}`
        : p.productId;
      return key === existingKey;
    });

    if (existing) {
      setSelectedProducts(selectedProducts.map(p => {
        const key = p.optionId
          ? `${p.productId}-${p.optionId}`
          : p.productId;
        return key === existingKey ? { ...p, quantity: p.quantity + 1 } : p;
      }));
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: `pp-${Date.now()}`,
          productId: product.id,
          productName,
          optionId: selectedOptionId || undefined,
          optionName,
          quantity: 1,
          unitPrice,
        },
      ]);
    }

    // 선택 초기화
    setSelectedProductId('');
    setSelectedOptionId('');
  };

  const handleRemoveProduct = (itemId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(selectedProducts.map(p =>
      p.id === itemId ? { ...p, quantity } : p
    ));
  };

  const packSize = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const discountRate = regularPrice > 0
      ? Math.round((1 - promotionPrice / regularPrice) * 100)
      : 0;

    onSave({
      id: pack?.id || '',
      description,
      packSize,
      products: selectedProducts,
      regularPrice,
      discountPrice,
      promotionPrice,
      discountRate,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pack ? '구성 수정' : '구성 추가'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 제품 선택 영역 */}
        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          <label className="label">제품 선택</label>
          <div className="grid grid-cols-1 gap-3">
            {/* 제품 선택 */}
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedOptionId('');
              }}
              className="select-field"
            >
              <option value="">제품을 선택하세요</option>
              {products.filter(p => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>
                  [{brandLabels[p.brand]}] {p.name} (₩{formatPrice(p.sellingPrice)})
                  {p.options.length > 0 && ` - ${p.options.length}개 옵션`}
                </option>
              ))}
            </select>

            {/* 옵션 선택 (제품에 옵션이 있는 경우) */}
            {hasOptions && (
              <div className="flex gap-2">
                <select
                  value={selectedOptionId}
                  onChange={(e) => setSelectedOptionId(e.target.value)}
                  className="select-field flex-1"
                >
                  <option value="">옵션 선택 (선택사항)</option>
                  {selectedProduct.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}: {opt.value}
                      {opt.additionalPrice ? ` (+₩${formatPrice(opt.additionalPrice)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 추가 버튼 */}
            <button
              type="button"
              onClick={handleAddProduct}
              disabled={!selectedProductId}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              제품 추가
            </button>
          </div>
        </div>

        {/* 선택된 제품 목록 */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label">선택된 제품 (총 {packSize}개)</label>
              <span className="text-sm text-gray-500">
                정상가 합계: ₩{formatPrice(selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0))}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {product.productName}
                      {product.optionName && (
                        <span className="ml-2 text-sm text-primary-600">({product.optionName})</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      ₩{formatPrice(product.unitPrice)} × {product.quantity}개 = ₩{formatPrice(product.unitPrice * product.quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(product.id, product.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{product.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(product.id, product.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(product.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 구성 설명 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">구성명 *</label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoDescription}
                onChange={(e) => setAutoDescription(e.target.checked)}
                className="rounded border-gray-300"
              />
              자동 생성
            </label>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setAutoDescription(false);
            }}
            className="input-field"
            placeholder="예: 아토로션 아기스틱밤 2종 (쿨링+고보습)"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            제품 선택 시 자동으로 구성명이 생성됩니다. 직접 수정도 가능합니다.
          </p>
        </div>

        {/* 가격 설정 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">정상가 *</label>
            <input
              type="number"
              value={regularPrice}
              onChange={(e) => setRegularPrice(Number(e.target.value))}
              className="input-field"
              min={0}
              required
            />
            <p className="mt-1 text-xs text-gray-500">자동 계산됨</p>
          </div>
          <div>
            <label className="label">상시 할인가 *</label>
            <input
              type="number"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(Number(e.target.value))}
              className="input-field"
              min={0}
              required
            />
          </div>
          <div>
            <label className="label">최종 행사가 *</label>
            <input
              type="number"
              value={promotionPrice}
              onChange={(e) => setPromotionPrice(Number(e.target.value))}
              className="input-field"
              min={0}
              required
            />
          </div>
        </div>

        {/* 할인율 표시 */}
        {regularPrice > 0 && promotionPrice > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">최종 할인율</span>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((1 - promotionPrice / regularPrice) * 100)}% 할인
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 line-through">₩{formatPrice(regularPrice)}</div>
                <div className="text-lg font-bold text-gray-900">₩{formatPrice(promotionPrice)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={selectedProducts.length === 0}
          >
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
}

// 프로모션 상세 컴포넌트
interface PromotionDetailProps {
  promotion: Promotion;
}

function PromotionDetail({ promotion }: PromotionDetailProps) {
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getStatusBadgeVariant = (status: PromotionStatus): 'success' | 'info' | 'warning' | 'primary' | 'danger' | 'gray' => {
    const variants: Record<PromotionStatus, 'success' | 'info' | 'warning' | 'primary' | 'danger' | 'gray'> = {
      scheduled: 'info',
      active: 'success',
      ended: 'gray',
    };
    return variants[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/promotion')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={getStatusBadgeVariant(promotion.status)}>
                {promotionStatusLabels[promotion.status]}
              </Badge>
              {!promotion.isActive && (
                <Badge variant="gray">비활성</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{promotion.name}</h1>
          </div>
        </div>
        <button
          onClick={() => navigate(`/promotion/${promotion.id}/edit`)}
          className="btn-primary flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          수정
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-gray-500">시작일</span>
                <p className="font-medium text-gray-900 mt-1">{promotion.startDate}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">종료일</span>
                <p className="font-medium text-gray-900 mt-1">{promotion.endDate}</p>
              </div>
            </div>

            {promotion.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <span className="text-sm text-gray-500">설명</span>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{promotion.description}</p>
              </div>
            )}
          </Card>

          {/* 구성 목록 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-xl">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">제품 구성 및 가격</h2>
              {promotion.packs.length > 0 && (
                <Badge variant="success">{promotion.packs.length}개</Badge>
              )}
            </div>

            {promotion.packs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">등록된 구성이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {promotion.packs.map((pack) => (
                  <div
                    key={pack.id}
                    className="p-5 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{pack.description}</h4>
                        <p className="text-sm text-gray-500">구성 {pack.packSize}개</p>
                      </div>
                      {pack.discountRate && (
                        <Badge variant="danger">{pack.discountRate}% 할인</Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      {pack.products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {product.productName}
                              {product.optionName && (
                                <span className="ml-1 text-primary-600">({product.optionName})</span>
                              )}
                            </span>
                            <Badge variant="gray">x{product.quantity}</Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            ₩{formatPrice(product.unitPrice)} × {product.quantity} = ₩{formatPrice(product.unitPrice * product.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">정상가</p>
                        <p className="text-lg line-through text-gray-400">₩{formatPrice(pack.regularPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">상시 할인가</p>
                        <p className="text-lg text-gray-600">₩{formatPrice(pack.discountPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">최종 행사가</p>
                        <p className="text-xl font-bold text-purple-600">₩{formatPrice(pack.promotionPrice)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 메모 */}
          {promotion.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">메모</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{promotion.notes}</p>
            </Card>
          )}
        </div>

        {/* 우측 영역 */}
        <div className="space-y-6">
          {/* 요약 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">요약</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">총 구성 수</span>
                <span className="font-medium text-gray-900">{promotion.packs.length}개</span>
              </div>
              {promotion.packs.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">최저 행사가</span>
                    <span className="font-bold text-purple-600">
                      ₩{formatPrice(Math.min(...promotion.packs.map(p => p.promotionPrice)))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">최고 행사가</span>
                    <span className="font-bold text-purple-600">
                      ₩{formatPrice(Math.max(...promotion.packs.map(p => p.promotionPrice)))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* 등록 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">등록 정보</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">등록일</span>
                <span className="text-gray-900">{formatDate(promotion.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">최종 수정일</span>
                <span className="text-gray-900">{formatDate(promotion.updatedAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
