import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  X,
  MoreVertical,
  FlaskConical,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import ProductMasterForm from '../components/products/ProductMasterForm';
import ProductMasterDetail from '../components/products/ProductMasterDetail';
import { useProductMasterStore } from '../store/useProductMasterStore';
import {
  ProductMaster,
  Brand,
  ProductCategory,
} from '../types';
import { brandLabels } from '../utils/helpers';

const categoryLabels: Record<ProductCategory, string> = {
  '크림': '크림',
  '패드': '패드',
  '로션': '로션',
  '스틱': '스틱',
  '앰플': '앰플',
  '세럼': '세럼',
  '미스트': '미스트',
  '클렌저': '클렌저',
  '선크림': '선크림',
  '마스크팩': '마스크팩',
  '기타': '기타',
};

export default function ProductMasterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, addProduct, updateProduct, deleteProduct } = useProductMasterStore();
  const isEditMode = location.pathname.endsWith('/edit');

  // 새 제품 등록
  if (id === 'new') {
    const handleSave = (data: Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'>) => {
      addProduct(data);
      navigate('/product-master');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 제품 등록</h1>
        <ProductMasterForm onSave={handleSave} />
      </div>
    );
  }

  // 제품 수정
  if (id && isEditMode) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">제품을 찾을 수 없습니다.</p>
        </div>
      );
    }

    const handleSave = (data: Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'>) => {
      updateProduct(id, data);
      navigate(`/product-master/${id}`);
    };

    const handleDelete = () => {
      deleteProduct(id);
      navigate('/product-master');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">제품 정보 수정</h1>
        <ProductMasterForm product={product} onSave={handleSave} onDelete={handleDelete} />
      </div>
    );
  }

  // 제품 상세보기
  if (id) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">제품을 찾을 수 없습니다.</p>
        </div>
      );
    }

    return <ProductMasterDetail product={product} />;
  }

  // 제품 목록
  return <ProductMasterList />;
}

// 제품 목록 컴포넌트
function ProductMasterList() {
  const navigate = useNavigate();
  const { products, deleteProduct } = useProductMasterStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(query) ||
            p.skuId?.toLowerCase().includes(query) ||
            p.materialCode?.toLowerCase().includes(query) ||
            p.abbreviation?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter((p) => (selectedBrand ? p.brand === selectedBrand : true))
      .filter((p) => (selectedCategory ? p.category === selectedCategory : true))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [products, searchQuery, selectedBrand, selectedCategory]);

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteModalId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrand('');
    setSelectedCategory('');
  };

  const hasFilters = searchQuery || selectedBrand || selectedCategory;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const renderProductRow = (product: ProductMaster) => {
    const isMenuOpen = actionMenuId === product.id;

    return (
      <tr
        key={product.id}
        className="hover:bg-gray-50 cursor-pointer transition-all"
        onClick={() => navigate(`/product-master/${product.id}`)}
      >
        <td className="table-cell">
          <div className="flex items-center gap-3">
            {product.thumbnailUrl ? (
              <img
                src={product.thumbnailUrl}
                alt={product.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{product.name}</p>
              <p className="text-sm text-gray-500">{brandLabels[product.brand]}</p>
            </div>
          </div>
        </td>
        <td className="table-cell text-gray-600">{product.category}</td>
        <td className="table-cell">
          <div className="space-y-1">
            {product.skuId && (
              <p className="text-xs text-gray-500">SKU: {product.skuId}</p>
            )}
            {product.materialCode && (
              <p className="text-xs text-gray-500">자재: {product.materialCode}</p>
            )}
            {product.abbreviation && (
              <p className="text-xs text-gray-500">약호: {product.abbreviation}</p>
            )}
          </div>
        </td>
        <td className="table-cell text-gray-600">{product.manufacturer}</td>
        <td className="table-cell text-right">
          <p className="text-gray-600">₩{formatPrice(product.costPrice)}</p>
        </td>
        <td className="table-cell text-right">
          <p className="font-medium text-gray-900">₩{formatPrice(product.sellingPrice)}</p>
        </td>
        <td className="table-cell">
          <div className="flex items-center gap-1">
            {product.certifications.vegan && (
              <Badge variant="success" className="text-xs">비건</Badge>
            )}
            {product.certifications.ewgGrade && (
              <Badge variant="info" className="text-xs">EWG {product.certifications.ewgGrade}</Badge>
            )}
            {product.certifications.dermaTest && (
              <Badge variant="primary" className="text-xs">더마</Badge>
            )}
          </div>
        </td>
        <td className="table-cell">
          <div className="flex items-center gap-2">
            {product.clinicalTests.length > 0 && (
              <Badge variant="warning" className="text-xs">
                <FlaskConical className="w-3 h-3 mr-1" />
                {product.clinicalTests.length}
              </Badge>
            )}
            {product.options.length > 0 && (
              <Badge variant="gray" className="text-xs">
                옵션 {product.options.length}
              </Badge>
            )}
          </div>
        </td>
        <td className="table-cell">
          <Badge variant={product.isActive ? 'success' : 'gray'}>
            {product.isActive ? '활성' : '비활성'}
          </Badge>
        </td>
        <td className="table-cell">
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
                  setActionMenuId(product.id);
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
                      navigate(`/product-master/${product.id}`);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    보기
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/product-master/${product.id}/edit`);
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
                      setDeleteModalId(product.id);
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
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
            <Package className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">제품 마스터</h1>
            <p className="text-gray-500">
              총 {filteredProducts.length}개의 제품
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            엑셀 업로드
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button
            onClick={() => navigate('/product-master/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            제품 등록
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="제품명, SKU, 자재번호, 약호 검색..."
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
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value as Brand | '')}
                className="select-field w-40"
              >
                <option value="">모든 브랜드</option>
                {Object.entries(brandLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | '')}
                className="select-field w-40"
              >
                <option value="">모든 카테고리</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
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

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            title="등록된 제품이 없습니다"
            description="새 제품을 등록하여 관리를 시작하세요"
            action={
              <button
                onClick={() => navigate('/product-master/new')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                제품 등록
              </button>
            }
          />
        </Card>
      ) : (
        <Card padding="none" overflow="visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">제품명</th>
                  <th className="table-header">카테고리</th>
                  <th className="table-header">코드 정보</th>
                  <th className="table-header">제조사</th>
                  <th className="table-header text-right">원가</th>
                  <th className="table-header text-right">판매가</th>
                  <th className="table-header">인증</th>
                  <th className="table-header">임상/옵션</th>
                  <th className="table-header">상태</th>
                  <th className="table-header w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => renderProductRow(product))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="제품 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 제품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
