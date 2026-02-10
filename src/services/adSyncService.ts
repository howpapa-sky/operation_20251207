/**
 * 광고 비용 데이터 동기화 서비스
 *
 * 지원 플랫폼:
 * - Meta Ads (Facebook/Instagram) - Netlify에서 직접 호출
 * - 네이버 검색광고 - NCP 프록시 경유
 * - 쿠팡 광고 - NCP 프록시 경유
 *
 * 데이터 플로우:
 * 프론트엔드 → commerce-proxy (Netlify Function) → ad_spend_daily (DB)
 * commerce-proxy가 자격증명 조회, API 호출, DB 저장을 모두 처리합니다.
 */

import { supabase } from '../lib/supabase';
import type { AdPlatform, AdSpendDaily } from '../types/ecommerce';

// 동기화 진행 콜백
export interface AdSyncProgressCallback {
  onProgress: (message: string, percent: number) => void;
  onComplete: (result: AdSyncResult) => void;
  onError: (error: string) => void;
}

// 동기화 결과
export interface AdSyncResult {
  success: boolean;
  platform: AdPlatform;
  message: string;
  recordsCreated: number;
  recordsUpdated: number;
  dateRange: { start: string; end: string };
}

/**
 * 플랫폼별 광고 동기화 (commerce-proxy 경유)
 *
 * commerce-proxy가 자격증명 조회 → API 호출 → ad_spend_daily upsert를 모두 처리합니다.
 */
export async function syncAdSpend(
  platform: AdPlatform,
  brandId: string,
  startDate: string,
  endDate: string,
  callback?: AdSyncProgressCallback
): Promise<AdSyncResult> {
  const platformLabels: Record<string, string> = {
    meta: 'Meta (FB/IG)',
    naver_sa: '네이버 검색광고',
    coupang_ads: '쿠팡 광고',
  };

  const label = platformLabels[platform] || platform;

  try {
    callback?.onProgress(`${label} 데이터 동기화 중...`, 20);

    const response = await fetch('/.netlify/functions/commerce-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ad-sync',
        platform,
        brandId,
        startDate,
        endDate,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      const errorMsg = result.error || `${label} 동기화 실패`;
      callback?.onError(errorMsg);
      return {
        success: false,
        platform,
        message: errorMsg,
        recordsCreated: 0,
        recordsUpdated: 0,
        dateRange: { start: startDate, end: endDate },
      };
    }

    callback?.onProgress('완료', 100);

    const syncResult: AdSyncResult = {
      success: true,
      platform,
      message: result.message || `${label} 동기화 완료`,
      recordsCreated: result.recordsCreated || 0,
      recordsUpdated: 0,
      dateRange: { start: startDate, end: endDate },
    };

    callback?.onComplete(syncResult);
    return syncResult;
  } catch (error) {
    const errorMsg = `${label} 동기화 오류: ${(error as Error).message}`;
    callback?.onError(errorMsg);
    return {
      success: false,
      platform,
      message: errorMsg,
      recordsCreated: 0,
      recordsUpdated: 0,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

/**
 * 브랜드별 일별 광고비 합계 조회
 */
export async function getAdSpendByDateRange(
  brandId: string,
  startDate: string,
  endDate: string,
  platform?: AdPlatform
): Promise<AdSpendDaily[]> {
  try {
    let query = (supabase as any)
      .from('ad_spend_daily')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      brandId: row.brand_id as string,
      date: row.date as string,
      platform: row.platform as AdPlatform,
      spend: Number(row.spend) || 0,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      conversionValue: Number(row.conversion_value) || 0,
      ctr: Number(row.ctr) || 0,
      cpc: Number(row.cpc) || 0,
      roas: Number(row.roas) || 0,
      syncedAt: row.synced_at as string | undefined,
      rawData: row.raw_data as Record<string, unknown> | undefined,
      createdAt: row.created_at as string,
    }));
  } catch (error) {
    console.error('Get ad spend error:', error);
    return [];
  }
}

/**
 * 브랜드별 기간 총 광고비 조회
 */
export async function getTotalAdSpend(
  brandId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await getAdSpendByDateRange(brandId, startDate, endDate);
  return data.reduce((sum, item) => sum + item.spend, 0);
}
