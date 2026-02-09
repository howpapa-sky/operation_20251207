import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrandStore, useBrandOptions } from '@/store/brandStore';
import { cn } from '@/lib/utils';

interface BrandSelectorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default';
}

export function BrandSelector({ className, showLabel = false, size = 'default' }: BrandSelectorProps) {
  const { selectedBrandId, selectBrand, fetchBrands, isLoading } = useBrandStore();
  const brandOptions = useBrandOptions();

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  if (brandOptions.length === 0) {
    return null;
  }

  // Don't show selector if only one brand
  if (brandOptions.length === 1) {
    const brand = brandOptions[0];
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: brand.color || '#f97316' }}
        />
        <span className={cn(
          'font-medium',
          size === 'sm' ? 'text-sm' : 'text-base'
        )}>
          {brand.label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">브랜드:</span>
      )}
      <Select
        value={selectedBrandId || undefined}
        onValueChange={(value) => selectBrand(value)}
        disabled={isLoading}
      >
        <SelectTrigger className={cn(
          'w-auto min-w-[140px]',
          size === 'sm' && 'h-8 text-sm'
        )}>
          <SelectValue placeholder="브랜드 선택" />
        </SelectTrigger>
        <SelectContent>
          {brandOptions.map((brand) => (
            <SelectItem key={brand.value} value={brand.value}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: brand.color || '#f97316' }}
                />
                <span>{brand.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// All brands option (for dashboard that shows combined data)
interface BrandSelectorWithAllProps extends BrandSelectorProps {
  showAllOption?: boolean;
  allLabel?: string;
}

export function BrandSelectorWithAll({
  className,
  showLabel = false,
  size = 'default',
  showAllOption = true,
  allLabel = '전체 브랜드',
}: BrandSelectorWithAllProps) {
  const { selectedBrandId, selectBrand, fetchBrands, isLoading } = useBrandStore();
  const brandOptions = useBrandOptions();

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  if (brandOptions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">브랜드:</span>
      )}
      <Select
        value={selectedBrandId || 'all'}
        onValueChange={(value) => selectBrand(value === 'all' ? null : value)}
        disabled={isLoading}
      >
        <SelectTrigger className={cn(
          'w-auto min-w-[140px]',
          size === 'sm' && 'h-8 text-sm'
        )}>
          <SelectValue placeholder="브랜드 선택" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-green-500" />
                <span>{allLabel}</span>
              </div>
            </SelectItem>
          )}
          {brandOptions.map((brand) => (
            <SelectItem key={brand.value} value={brand.value}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: brand.color || '#f97316' }}
                />
                <span>{brand.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Brand badge for display
interface BrandBadgeProps {
  brandId?: string;
  brandCode?: string;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function BrandBadge({ brandId, brandCode, size = 'default', showLabel = true }: BrandBadgeProps) {
  const { getBrandById, getBrandByCode } = useBrandStore();

  const brand = brandId
    ? getBrandById(brandId)
    : brandCode
      ? getBrandByCode(brandCode as 'howpapa' | 'nucio')
      : null;

  if (!brand) return null;

  const sizeClasses = {
    sm: 'w-2 h-2',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn('rounded-full', sizeClasses[size])}
        style={{ backgroundColor: brand.primaryColor || '#f97316' }}
      />
      {showLabel && (
        <span className={cn('font-medium', textSizeClasses[size])}>
          {brand.name}
        </span>
      )}
    </div>
  );
}
