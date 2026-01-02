import { ReactNode, useState } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterItem {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterItem[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  showResetButton?: boolean;
  children?: ReactNode;
}

export default function FilterBar({
  filters,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = '검색...',
  onReset,
  showResetButton = true,
  children,
}: FilterBarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const hasActiveFilters = filters.some((f) => f.value && f.value !== 'all' && f.value !== '');

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* 모바일 토글 버튼 */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
        >
          <Filter className="w-4 h-4" />
          필터
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
          )}
          {isMobileOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* 모바일 검색 */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-xs ml-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 데스크톱 / 모바일 확장 필터 */}
      <div className={`${isMobileOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* 필터 드롭다운들 */}
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <div key={filter.key} className="relative">
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ))}

            {/* 추가 children (커스텀 필터) */}
            {children}
          </div>

          <div className="flex-1" />

          {/* 데스크톱 검색 */}
          {onSearchChange && (
            <div className="hidden lg:block relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* 초기화 버튼 */}
          {showResetButton && hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              필터 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
