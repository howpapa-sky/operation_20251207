import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Brand, BrandCode } from '@/types/ecommerce';
import { handleApiError } from '@/lib/apiErrorHandler';

interface BrandState {
  // Data
  brands: Brand[];
  selectedBrandId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  selectedBrand: Brand | null;

  // Actions
  fetchBrands: () => Promise<void>;
  selectBrand: (brandId: string | null) => void;
  selectBrandByCode: (code: BrandCode) => void;
  getBrandById: (id: string) => Brand | undefined;
  getBrandByCode: (code: BrandCode) => Brand | undefined;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      // Initial state
      brands: [],
      selectedBrandId: null,
      isLoading: false,
      error: null,

      // Computed
      get selectedBrand() {
        const { brands, selectedBrandId } = get();
        return brands.find(b => b.id === selectedBrandId) || null;
      },

      // Fetch all brands
      fetchBrands: async () => {
        set({ isLoading: true, error: null });

        try {
          // Note: 'brands' table created in migration 009_multi_brand_advertising.sql
          // Using type assertion since table may not be in database.types.ts yet
          const { data, error } = await (supabase as any)
            .from('brands')
            .select('*')
            .eq('is_active', true)
            .order('code');

          if (error) throw error;

          const brands: Brand[] = (data || []).map((row: any) => ({
            id: row.id,
            code: row.code as BrandCode,
            name: row.name,
            displayName: row.display_name,
            primaryColor: row.primary_color,
            logoUrl: row.logo_url,
            isActive: row.is_active,
            settings: row.settings,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));

          set({ brands, isLoading: false });

          // Auto-select first brand if none selected
          const { selectedBrandId } = get();
          if (!selectedBrandId && brands.length > 0) {
            set({ selectedBrandId: brands[0].id });
          }
        } catch (err: any) {
          handleApiError(err, '브랜드 목록 조회');
          console.error('[brandStore] fetchBrands error:', err);
          set({ error: err.message, isLoading: false });
        }
      },

      // Select brand by ID
      selectBrand: (brandId: string | null) => {
        set({ selectedBrandId: brandId });
      },

      // Select brand by code
      selectBrandByCode: (code: BrandCode) => {
        const { brands } = get();
        const brand = brands.find(b => b.code === code);
        if (brand) {
          set({ selectedBrandId: brand.id });
        }
      },

      // Get brand by ID
      getBrandById: (id: string) => {
        return get().brands.find(b => b.id === id);
      },

      // Get brand by code
      getBrandByCode: (code: BrandCode) => {
        return get().brands.find(b => b.code === code);
      },
    }),
    {
      name: 'brand-storage',
      partialize: (state) => ({
        selectedBrandId: state.selectedBrandId,
      }),
    }
  )
);

// Hook for getting the selected brand with fallback
export function useSelectedBrand(): Brand | null {
  const { brands, selectedBrandId } = useBrandStore();
  return brands.find(b => b.id === selectedBrandId) || brands[0] || null;
}

// Hook for brand options (for Select components)
export function useBrandOptions() {
  const { brands } = useBrandStore();
  return brands.map(b => ({
    value: b.id,
    label: b.name,
    code: b.code,
    color: b.primaryColor,
  }));
}
