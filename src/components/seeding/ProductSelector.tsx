import { useState, useEffect, useRef } from 'react';
import { Search, Package, ChevronDown, X, Check } from 'lucide-react';
import { useProductMasterStore } from '../../store/useProductMasterStore';
import { ProductMaster, Brand } from '../../types';

interface ProductSelectorProps {
  value?: string;
  brand?: Brand;
  onChange: (product: ProductMaster | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ProductSelector({
  value,
  brand,
  onChange,
  placeholder = '제품 선택...',
  disabled = false,
}: ProductSelectorProps) {
  const { products } = useProductMasterStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 브랜드 필터링
  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false;
    if (brand && p.brand !== brand) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(searchLower) ||
        p.skuId?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // 선택된 제품
  const selectedProduct = products.find((p) => p.id === value);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: ProductMaster) => {
    onChange(product);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-xl text-left transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
            : isOpen
            ? 'border-primary-500 ring-2 ring-primary-100'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                selectedProduct.brand === 'howpapa' ? 'bg-orange-100' : 'bg-green-100'
              }`}
            >
              <Package
                className={`w-4 h-4 ${
                  selectedProduct.brand === 'howpapa' ? 'text-orange-600' : 'text-green-600'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{selectedProduct.name}</div>
              <div className="text-xs text-gray-500">
                원가 ₩{formatPrice(selectedProduct.costPrice)} / 판매가 ₩
                {formatPrice(selectedProduct.sellingPrice)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}

        <div className="flex items-center gap-1 ml-2">
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제품명, SKU 검색..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary-100"
                autoFocus
              />
            </div>
          </div>

          {/* Product List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {search ? '검색 결과가 없습니다.' : '등록된 제품이 없습니다.'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredProducts.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        product.id === value ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          product.brand === 'howpapa' ? 'bg-orange-100' : 'bg-green-100'
                        }`}
                      >
                        {product.thumbnailUrl ? (
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package
                            className={`w-5 h-5 ${
                              product.brand === 'howpapa' ? 'text-orange-600' : 'text-green-600'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{product.name}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              product.brand === 'howpapa'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {product.brand === 'howpapa' ? '하우파파' : '누씨오'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {product.category} · 원가 ₩{formatPrice(product.costPrice)}
                        </div>
                      </div>
                      {product.id === value && (
                        <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Selected Product Preview */}
      {selectedProduct && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl">
          <div className="text-xs text-gray-500 mb-2">제품 정보</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">카테고리:</span>{' '}
              <span className="text-gray-900">{selectedProduct.category}</span>
            </div>
            <div>
              <span className="text-gray-500">제조사:</span>{' '}
              <span className="text-gray-900">{selectedProduct.manufacturer}</span>
            </div>
            <div>
              <span className="text-gray-500">원가:</span>{' '}
              <span className="text-gray-900 font-medium">
                ₩{formatPrice(selectedProduct.costPrice)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">판매가:</span>{' '}
              <span className="text-gray-900 font-medium">
                ₩{formatPrice(selectedProduct.sellingPrice)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
