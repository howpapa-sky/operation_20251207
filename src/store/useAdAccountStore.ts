import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/apiErrorHandler';
import { useBrandStore } from './brandStore';
import type { AdAccount, AdPlatform } from '../types/ecommerce';

interface AdAccountState {
  accounts: AdAccount[];
  isLoading: boolean;
  error: string | null;
  testingPlatform: AdPlatform | null;

  // CRUD
  fetchAccounts: () => Promise<void>;
  saveAccount: (platform: AdPlatform, data: Partial<AdAccount>) => Promise<boolean>;
  deleteAccount: (platform: AdPlatform) => Promise<void>;
  toggleActive: (platform: AdPlatform, isActive: boolean) => Promise<void>;

  // 연결 테스트
  testConnection: (platform: AdPlatform) => Promise<{ success: boolean; message: string }>;

  // 헬퍼
  getAccount: (platform: AdPlatform) => AdAccount | undefined;
}

function mapRowToAdAccount(row: Record<string, unknown>): AdAccount {
  return {
    id: row.id as string,
    brandId: row.brand_id as string,
    platform: row.platform as AdPlatform,
    accountName: (row.account_name as string) || undefined,
    isActive: row.is_active as boolean,
    lastSyncAt: (row.last_sync_at as string) || undefined,
    syncStatus: (row.sync_status as AdAccount['syncStatus']) || 'never',
    syncError: (row.sync_error as string) || undefined,

    // 네이버 검색광고
    naverCustomerId: (row.naver_customer_id as string) || undefined,
    naverApiKey: (row.naver_api_key as string) || undefined,
    naverSecretKey: (row.naver_secret_key as string) || undefined,

    // 네이버 GFA
    naverGfaCustomerId: (row.naver_gfa_customer_id as string) || undefined,
    naverGfaApiKey: (row.naver_gfa_api_key as string) || undefined,
    naverGfaSecretKey: (row.naver_gfa_secret_key as string) || undefined,

    // 메타
    metaAppId: (row.meta_app_id as string) || undefined,
    metaAppSecret: (row.meta_app_secret as string) || undefined,
    metaAccessToken: (row.meta_access_token as string) || undefined,
    metaTokenExpiresAt: (row.meta_token_expires_at as string) || undefined,
    metaAdAccountId: (row.meta_ad_account_id as string) || undefined,
    metaBusinessId: (row.meta_business_id as string) || undefined,

    // 쿠팡 광고
    coupangAdsVendorId: (row.coupang_ads_vendor_id as string) || undefined,
    coupangAdsAccessKey: (row.coupang_ads_access_key as string) || undefined,
    coupangAdsSecretKey: (row.coupang_ads_secret_key as string) || undefined,

    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useAdAccountStore = create<AdAccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,
  testingPlatform: null,

  fetchAccounts: async () => {
    const { selectedBrandId } = useBrandStore.getState();
    if (!selectedBrandId) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await (supabase as any)
        .from('ad_accounts')
        .select('*')
        .eq('brand_id', selectedBrandId);

      if (error) throw error;

      const accounts = (data || []).map((row: Record<string, unknown>) => mapRowToAdAccount(row));
      set({ accounts });
    } catch (error) {
      handleApiError(error, '광고 계정 조회');
      console.error('Fetch ad accounts error:', error);
      set({ error: '광고 계정을 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveAccount: async (platform, data) => {
    const { selectedBrandId } = useBrandStore.getState();
    if (!selectedBrandId) return false;

    try {
      const dbData: Record<string, unknown> = {
        brand_id: selectedBrandId,
        platform,
        account_name: data.accountName || null,
        is_active: data.isActive ?? true,
        sync_status: 'success',
      };

      // 플랫폼별 필드 매핑
      if (platform === 'meta') {
        dbData.meta_access_token = data.metaAccessToken || null;
        dbData.meta_ad_account_id = data.metaAdAccountId || null;
        dbData.meta_app_id = data.metaAppId || null;
        dbData.meta_app_secret = data.metaAppSecret || null;
        dbData.meta_business_id = data.metaBusinessId || null;
      } else if (platform === 'naver_sa') {
        dbData.naver_api_key = data.naverApiKey || null;
        dbData.naver_secret_key = data.naverSecretKey || null;
        dbData.naver_customer_id = data.naverCustomerId || null;
      } else if (platform === 'naver_gfa') {
        dbData.naver_gfa_api_key = data.naverGfaApiKey || null;
        dbData.naver_gfa_secret_key = data.naverGfaSecretKey || null;
        dbData.naver_gfa_customer_id = data.naverGfaCustomerId || null;
      } else if (platform === 'coupang_ads') {
        dbData.coupang_ads_vendor_id = data.coupangAdsVendorId || null;
        dbData.coupang_ads_access_key = data.coupangAdsAccessKey || null;
        dbData.coupang_ads_secret_key = data.coupangAdsSecretKey || null;
      }

      const { error } = await (supabase as any)
        .from('ad_accounts')
        .upsert(dbData, {
          onConflict: 'brand_id,platform',
        });

      if (error) throw error;

      await get().fetchAccounts();
      return true;
    } catch (error) {
      handleApiError(error, '광고 계정 저장');
      console.error('Save ad account error:', error);
      set({ error: '광고 계정 저장에 실패했습니다.' });
      return false;
    }
  },

  deleteAccount: async (platform) => {
    const { selectedBrandId } = useBrandStore.getState();
    if (!selectedBrandId) return;

    try {
      const { error } = await (supabase as any)
        .from('ad_accounts')
        .delete()
        .eq('brand_id', selectedBrandId)
        .eq('platform', platform);

      if (error) throw error;

      set((state) => ({
        accounts: state.accounts.filter((a) => a.platform !== platform),
      }));
    } catch (error) {
      handleApiError(error, '광고 계정 삭제');
      console.error('Delete ad account error:', error);
      set({ error: '광고 계정 삭제에 실패했습니다.' });
    }
  },

  toggleActive: async (platform, isActive) => {
    const { selectedBrandId } = useBrandStore.getState();
    if (!selectedBrandId) return;

    try {
      const { error } = await (supabase as any)
        .from('ad_accounts')
        .update({ is_active: isActive })
        .eq('brand_id', selectedBrandId)
        .eq('platform', platform);

      if (error) throw error;

      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.platform === platform ? { ...a, isActive } : a
        ),
      }));
    } catch (error) {
      handleApiError(error, '광고 계정 활성화 변경');
      console.error('Toggle ad account active error:', error);
    }
  },

  testConnection: async (platform) => {
    const account = get().accounts.find((a) => a.platform === platform);

    if (!account) {
      return { success: false, message: '저장된 광고 계정이 없습니다.' };
    }

    set({ testingPlatform: platform });

    try {
      // 필수 필드 검사
      const missingFields: string[] = [];

      if (platform === 'meta') {
        if (!account.metaAccessToken) missingFields.push('Access Token');
        if (!account.metaAdAccountId) missingFields.push('Ad Account ID');
      } else if (platform === 'naver_sa') {
        if (!account.naverApiKey) missingFields.push('API License Key');
        if (!account.naverSecretKey) missingFields.push('Secret Key');
        if (!account.naverCustomerId) missingFields.push('Customer ID');
      } else if (platform === 'naver_gfa') {
        if (!account.naverGfaApiKey) missingFields.push('API License Key');
        if (!account.naverGfaSecretKey) missingFields.push('Secret Key');
        if (!account.naverGfaCustomerId) missingFields.push('Customer ID');
      } else if (platform === 'coupang_ads') {
        if (!account.coupangAdsVendorId) missingFields.push('Vendor ID');
        if (!account.coupangAdsAccessKey) missingFields.push('Access Key');
        if (!account.coupangAdsSecretKey) missingFields.push('Secret Key');
      }

      if (missingFields.length > 0) {
        return { success: false, message: `필수 항목 누락: ${missingFields.join(', ')}` };
      }

      // 실제 API 연결 테스트: 최근 7일 데이터 동기화 시도
      const { selectedBrandId } = useBrandStore.getState();
      if (!selectedBrandId) {
        return { success: false, message: '브랜드를 선택해주세요.' };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const response = await fetch('/.netlify/functions/commerce-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ad-sync',
          platform,
          brandId: selectedBrandId,
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
        }),
      });

      const result = await response.json();

      if (result.success) {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.platform === platform ? { ...a, syncStatus: 'success', syncError: undefined } : a
          ),
        }));
        return {
          success: true,
          message: `API 연결 성공! ${result.recordsCreated ?? 0}건의 데이터가 확인되었습니다.`
        };
      } else {
        // 실패 시 sync_status를 failed로 업데이트
        await (supabase as any)
          .from('ad_accounts')
          .update({ sync_status: 'failed', sync_error: result.error })
          .eq('brand_id', selectedBrandId)
          .eq('platform', platform);

        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.platform === platform ? { ...a, syncStatus: 'failed', syncError: result.error } : a
          ),
        }));

        return { success: false, message: result.error || 'API 연결 실패' };
      }
    } catch (err) {
      handleApiError(err, '광고 연결 테스트');
      return { success: false, message: `연결 테스트 오류: ${(err as Error).message}` };
    } finally {
      set({ testingPlatform: null });
    }
  },

  getAccount: (platform) => {
    return get().accounts.find((a) => a.platform === platform);
  },
}));
